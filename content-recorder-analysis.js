// Default audio detection threshold - lowered for better sensitivity
const DEFAULT_SILENCE_THRESHOLD = 0.001; // Reduced from 0.01 to detect quieter sounds

/**
 * Checks if the audio data contains actual sound above the silence threshold
 * @param {Blob} audioBlob - Audio data from MediaRecorder's ondataavailable event
 * @param {number} [silenceThreshold=0.01] - Threshold for detecting silence (optional)
 * @returns {Promise<boolean>} - True if sound is detected, false if silence or error
 */
async function hasSound(audioBlob, silenceThreshold = DEFAULT_SILENCE_THRESHOLD) {
  try {
    // Вызываем функцию анализа и получаем результат и отчет
    const { hasSoundResult, analyzeReport } = await analyzeAudioForSound(audioBlob, silenceThreshold);
    
    // Выводим отчет об анализе
    console.log(`=== hasSound ANALYSIS REPORT ===`, analyzeReport);
    
    // Возвращаем результат проверки
    return hasSoundResult;
  } catch (error) {
    console.error('Error analyzing audio:', error);
    return false; // Возвращаем false при ошибке
  }
}

/**
 * Анализирует аудио данные и определяет, содержат ли они звук
 * @param {Blob} audioBlob - Аудио данные из MediaRecorder
 * @param {number} threshold - Порог для определения тишины
 * @returns {Promise<{hasSoundResult: boolean, analyzeReport: Object}>} - Результат анализа и подробный отчет
 */
async function analyzeAudioForSound(audioBlob, threshold) {
  // Создаем объект для сбора отчета об анализе
  const analyzeReport = {
    // Информация о входных данных
    inputData: {
      size: audioBlob.size,        // Размер blob в байтах
      type: audioBlob.type,        // Тип/формат аудио (MIME)
      threshold: threshold         // Используемый порог тишины
    },
    // Информация об AudioContext
    contextInfo: null,             // Будет заполнено информацией об AudioContext
    // Информация о декодированном аудио буфере
    audioBuffer: null,             // Будет заполнено деталями буфера
    // Анализ по каналам
    channelAnalysis: [],           // Массив с анализом каждого канала
    // Итоговые результаты
    results: {                     
      avgRms: null,                // Средний RMS по всем каналам
      hasSound: null,              // Результат на основе RMS
      hasPeaks: null,              // Есть ли пики в аудиоданных
      peaksDetails: [],            // Детали найденных пиков
      finalResult: null            // Итоговый результат анализа
    }
  };
  
  // Проверяем поддержку AudioContext
  if (!window.AudioContext && !window.webkitAudioContext) {
    analyzeReport.error = 'AudioContext not supported in this browser';
    return { hasSoundResult: false, analyzeReport };
  }

  try {
    // Преобразуем Blob в ArrayBuffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    analyzeReport.inputData.arrayBufferSize = arrayBuffer.byteLength; // Размер ArrayBuffer в байтах
    
    // Создаем AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyzeReport.contextInfo = {
      sampleRate: audioContext.sampleRate  // Частота дискретизации в Гц
    };
    
    // Декодируем аудио данные
    let audioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      audioContext.close();
      analyzeReport.error = `Error decoding audio: ${decodeError.message}`;
      return { hasSoundResult: false, analyzeReport };
    }
    
    // Сохраняем информацию о декодированном буфере
    analyzeReport.audioBuffer = {
      duration: audioBuffer.duration.toFixed(2) + 's',  // Длительность в секундах
      numberOfChannels: audioBuffer.numberOfChannels,   // Количество каналов (1=моно, 2=стерео)
      length: audioBuffer.length,                       // Количество сэмплов
      sampleRate: audioBuffer.sampleRate                // Частота дискретизации
    };
    
    // Анализируем все каналы
    const channels = audioBuffer.numberOfChannels;
    let totalRms = 0;
    const channelRmsValues = [];
    const displaySamples = 10; // Количество сэмплов для отображения
    
    // Для каждого канала
    for (let i = 0; i < channels; i++) {
      const channelData = audioBuffer.getChannelData(i);
      const sampleSize = channelData.length;
      
      // Собираем первые несколько значений для примера
      const sampleValues = [];
      for (let j = 0; j < displaySamples && j < sampleSize; j++) {
        sampleValues.push(channelData[j]);
      }
      
      // Вычисляем min/max/avg для первых 1000 сэмплов
      let min = 1, max = -1, sum = 0;
      for (let j = 0; j < Math.min(1000, sampleSize); j++) {
        const sample = channelData[j];
        min = Math.min(min, sample);
        max = Math.max(max, sample);
        sum += Math.abs(sample);
      }
      
      // Вычисляем RMS для всего канала
      let sumSquares = 0;
      for (let j = 0; j < sampleSize; j++) {
        sumSquares += channelData[j] * channelData[j];
      }
      const rms = Math.sqrt(sumSquares / sampleSize);
      channelRmsValues.push(rms);
      totalRms += rms;
      
      // Сохраняем информацию о канале
      analyzeReport.channelAnalysis.push({
        channel: i + 1,                            // Номер канала
        samples: sampleValues,                     // Примеры первых сэмплов
        length: sampleSize,                        // Длина канала в сэмплах
        stats: {                                   
          min,                                     // Минимальное значение амплитуды
          max,                                     // Максимальное значение амплитуды
          avg: sum/Math.min(1000, sampleSize)      // Средняя амплитуда (первые 1000 сэмплов)
        },
        rms: rms                                   // Root Mean Square (среднеквадратичное значение)
      });
    }
    
    // Вычисляем средний RMS по всем каналам
    const avgRms = totalRms / channels;
    analyzeReport.results.avgRms = avgRms;                  // Средний RMS всех каналов
    analyzeReport.results.hasSound = avgRms > threshold;    // Результат проверки по RMS
    
    // Освобождаем ресурсы
    audioContext.close();
    
    // Также пробуем другой подход - проверка на пики выше определенного уровня
    let hasPeaks = false;
    const peakThreshold = 0.1;  // Порог для определения пиков
    
    for (let i = 0; i < channels && !hasPeaks; i++) {
      const channelData = audioBuffer.getChannelData(i);
      // Проверяем выборочные точки по всему буферу
      const checkPoints = 100;
      for (let j = 0; j < checkPoints; j++) {
        const idx = Math.floor(channelData.length * (j / checkPoints));
        if (Math.abs(channelData[idx]) > peakThreshold) {
          hasPeaks = true;
          analyzeReport.results.peaksDetails.push({
            channel: i + 1,       // Номер канала с пиком
            index: idx,           // Индекс сэмпла с пиком
            value: channelData[idx] // Значение пика
          });
          break;
        }
      }
    }
    
    analyzeReport.results.hasPeaks = hasPeaks;  // Найдены ли пики
    
    // Определяем итоговый результат (звук есть, если RMS > порога ИЛИ найдены пики)
    const result = avgRms > threshold || hasPeaks;
    analyzeReport.results.finalResult = result;  // Итоговый результат анализа
    
    // Возвращаем результат и отчет
    return {
      hasSoundResult: result,
      analyzeReport
    };
  } catch (error) {
    // В случае ошибки анализа
    analyzeReport.error = `Analysis error: ${error.message}`;
    return { hasSoundResult: false, analyzeReport };
  }
}

// Функция для воспроизведения записи
function playRecording(audioBlob) {
  try {
    // Проверяем, на какой странице мы находимся
    if (isRestrictedPage(window.location.href)) {
      console.log('Запись на системной странице. Создание элемента аудио невозможно из-за ограничений CSP.');
      downloadRecording(audioBlob);
      return;
    }
    
    // Создаем URL для Blob
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Получаем или создаем контейнер для аудио
    const audioContainer = setupAudioContainer();
    
    // Создаем аудио элемент и добавляем элементы управления
    setupAudioElement(audioContainer, audioUrl, audioBlob);
    
  } catch (err) {
    console.error('Ошибка при воспроизведении записи:', err);
    downloadRecording(audioBlob);
  }
}

// Создание и настройка контейнера для аудио
function setupAudioContainer() {
  const existingContainer = document.getElementById('audio-container');
  if (existingContainer) {
    while (existingContainer.firstChild) {
      existingContainer.removeChild(existingContainer.firstChild);
    }
    return existingContainer;
  }
  
  return createAudioContainer();
}

// Создание и настройка аудио элемента с элементами управления
function setupAudioElement(container, audioUrl, audioBlob) {
  // Создаем временный аудио элемент
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = audioUrl;
  container.appendChild(audio);
  
  // Функция для очистки ресурсов
  const cleanup = () => {
    URL.revokeObjectURL(audioUrl);
    if (container && container.parentNode) {
      container.remove();
    }
    audio.onended = null;
    audio.onerror = null;
  };

  // Добавляем обработчики событий
  audio.onended = cleanup;
  audio.onerror = (error) => {
    console.error('Ошибка воспроизведения аудио:', error);
    cleanup();
  };

  // Добавляем информацию о записи
  const infoDiv = document.createElement('div');
  infoDiv.textContent = i18n.getTranslation('recording_info', audioBlob.type, (audioBlob.size / 1024).toFixed(1));
  container.appendChild(infoDiv);
  
  // Добавляем кнопку скачивания
  const downloadButton = document.createElement('button');
  downloadButton.textContent = i18n.getTranslation('download_recording');
  downloadButton.onclick = () => downloadRecording(audioBlob);
  downloadButton.style.cssText = 'margin-top: 10px; padding: 5px 10px;';
  container.appendChild(downloadButton);
  
  // Автоматически воспроизводим
  audio.play().catch(err => console.log('Автоматическое воспроизведение не разрешено:', err));
}

// Функция для скачивания записи
function downloadRecording(audioBlob) {
  try {
    const fileName = `recording-${Date.now()}.${getFileExtension(audioBlob.type)}`;
    const url = URL.createObjectURL(audioBlob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    
    document.body.appendChild(a);
    a.click();
    
    // Удаляем элемент и освобождаем URL
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Запись доступна для скачивания как ${fileName}`);
    }, 100);
  } catch (err) {
    console.error('Ошибка при скачивании записи:', err);
    console.log('Невозможно скачать запись на текущей странице из-за ограничений безопасности');
  }
}

// Функция для создания контейнера для аудио
function createAudioContainer() {
  try {
    const container = document.createElement('div');
    container.id = 'audio-container';
    container.style.cssText = 'margin: 20px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; display: none;';
    
    // Проверяем, можем ли мы добавить контейнер в body
    if (document.body) {
      document.body.appendChild(container);
      
      // Добавляем заголовок
      const header = document.createElement('h3');
      header.textContent = i18n.getTranslation('recorded_audio');
      container.appendChild(header);
    } else {
      console.warn('Не удалось найти body для добавления аудио контейнера');
    }
    
    return container;
  } catch (err) {
    console.error('Ошибка при создании аудио контейнера:', err);
    return document.createElement('div'); // Возвращаем пустой div, если не удалось создать контейнер
  }
}
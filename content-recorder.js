// Переменные для записи аудио
let mediaRecorder = null;
let audioStream = null;
let audioChunks = []; // Для хранения частей записи

// Функция для определения поддерживаемого формата
function getSupportedMimeType() {
  const possibleTypes = [
    'audio/mp4',
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus'
  ];
  
  for (const type of possibleTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log(`Браузер поддерживает формат записи: ${type}`);
      return type;
    }
  }
  
  console.log('Указанные форматы не поддерживаются, используем формат по умолчанию');
  return '';
}

// Основная функция запуска записи - теперь более лаконичная
async function startRecording() {
  const startTime = performance.now();
  try {
    // Показываем маску в начале записи
    showRecordingMask();
    
    // Проверяем API ключ перед началом записи
    if (!await checkApiKey()) {
      console.log('Запись отменена из-за отсутствия API ключа');
      hideRecordingMask();
      return;
    }
    
    // Устанавливаем флаги состояния
    isRecordingInitializing = true;
    createMediaRecorderAllowed = true;
    
    // Получаем предпочитаемый микрофон из настроек
    const preferredMicrophoneId = await getPreferredMicrophone();
    
    // Получаем поток с микрофона
    try {
      await setupAudioStream(preferredMicrophoneId);
    } catch (error) {
      console.error("Ошибка при получении аудиопотока:", error);
      handleRecordingError(error, startTime);
      return;
    }
    
    // Проверяем, не потеряло ли окно фокус
    if (!createMediaRecorderAllowed) {
      handleLostFocus();
      return;
    }
    
    // Создаем и настраиваем MediaRecorder
    await setupMediaRecorder();
    
    console.log(`Общее время инициализации записи: ${(performance.now() - startTime).toFixed(1)}мс`);
  } catch (err) {
    handleRecordingError(err, startTime);
  }
}

// Получение ID предпочитаемого микрофона из настроек
async function getPreferredMicrophone() {
  const settingsStartTime = performance.now();
  const { preferredMicrophoneId } = await new Promise((resolve) => {
    chrome.storage.sync.get({ preferredMicrophoneId: '' }, resolve);
  });
  console.log(`Время получения настроек: ${(performance.now() - settingsStartTime).toFixed(1)}мс`);
  return preferredMicrophoneId;
}

// Настройка аудиопотока с микрофона
async function setupAudioStream(preferredMicrophoneId) {
  const getUserMediaStartTime = performance.now();
  
  // Базовые аудиоконстрейнты, которые будут общими для всех попыток
  const baseAudioConstraints = {
    autoGainControl: false,
    echoCancellation: false,
    noiseSuppression: false,
    sampleRate: 22050,
    channelCount: 1
  };
  
  if (preferredMicrophoneId) {
    try {
      console.log("Пробуем использовать предпочитаемый микрофон");
      
      // Пробуем использовать предпочитаемый микрофон
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...baseAudioConstraints,
          deviceId: { exact: preferredMicrophoneId }
        }
      });
      
      console.log(`Время получения потока с предпочитаемого микрофона: ${(performance.now() - getUserMediaStartTime).toFixed(1)}мс`);
      logAudioStreamInfo(audioStream, "preferred");
      return;
    } catch (err) {
      console.log("Не удалось использовать предпочитаемый микрофон, пробуем микрофон по умолчанию:", err);
    }
  }
  
  // Используем микрофон по умолчанию (либо если предпочитаемый не указан, либо не удалось использовать)
  const fallbackStartTime = performance.now();
  audioStream = await navigator.mediaDevices.getUserMedia({ 
    audio: baseAudioConstraints
  });
  
  console.log(`Время получения потока с микрофона по умолчанию: ${(performance.now() - fallbackStartTime).toFixed(1)}мс`);
  logAudioStreamInfo(audioStream, "default");
}

// Логирование информации о полученном аудиопотоке
function logAudioStreamInfo(stream, sourceType) {
  if (!stream) return;
  
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    const trackSettings = audioTrack.getSettings();
    console.log(`Параметры аудиопотока (${sourceType}):`, {
      deviceId: trackSettings.deviceId,
      groupId: trackSettings.groupId,
      sampleRate: trackSettings.sampleRate,
      channelCount: trackSettings.channelCount,
      autoGainControl: trackSettings.autoGainControl,
      echoCancellation: trackSettings.echoCancellation,
      noiseSuppression: trackSettings.noiseSuppression,
      latency: trackSettings.latency
    });
  }
}

// Создание и настройка MediaRecorder
async function setupMediaRecorder() {
  const recorderStartTime = performance.now();
  
  // Выбираем поддерживаемый формат
  const mimeType = getSupportedMimeType();
  
  // Создаем MediaRecorder с подходящим форматом
  mediaRecorder = mimeType 
    ? new MediaRecorder(audioStream, { mimeType }) 
    : new MediaRecorder(audioStream);
  
  audioChunks = []; // Очищаем массив перед новой записью

  // Настраиваем обработчики событий
  setupMediaRecorderHandlers();
  
  // Запускаем запись с частыми фрагментами (каждые 100мс)
  mediaRecorder.start(100);
  
  // Меняем цвет маски на зеленый после успешного запуска MediaRecorder
  changeMaskToGreen();

  console.log(`Время создания и запуска MediaRecorder: ${(performance.now() - recorderStartTime).toFixed(1)}мс`);
  console.log(`Запись начата в формате: ${mediaRecorder.mimeType}`);
  
  // Логируем информацию о выбранном устройстве
  logSelectedDeviceInfo();
}

// Настройка обработчиков событий для MediaRecorder
function setupMediaRecorderHandlers() {
  // Собираем данные записи
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
    // Инициализация завершена после получения первого фрагмента
    isRecordingInitializing = false;
  };
  
  // Добавляем обработчик ошибок
  mediaRecorder.onerror = (event) => {
    console.error("Ошибка MediaRecorder:", event.error);
    cleanupRecordingResources();
    isRecordingInitializing = false;
  };
}

// Логирование информации о выбранном устройстве
function logSelectedDeviceInfo() {
  const audioTrack = audioStream.getAudioTracks()[0];
  if (audioTrack) {
    const settings = audioTrack.getSettings();
    console.log("Используется микрофон:", settings.deviceId, 
                "Метка:", audioTrack.label);
  }
}

// Обработка потери фокуса
function handleLostFocus() {
  console.log('Разрешение получено, но окно потеряло фокус. Прерываем создание MediaRecorder');
  // Освобождаем ресурсы
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  isRecordingInitializing = false;
}

// Обработка ошибок записи
function handleRecordingError(error, startTime) {
  console.error("Ошибка при запуске записи:", error);
  console.log(`Время до возникновения ошибки: ${(performance.now() - startTime).toFixed(1)}мс`);
  
  // Скрываем маску при ошибке
  hideRecordingMask();
  
  // Освобождаем ресурсы в случае ошибки
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }
  
  // Сбрасываем флаг инициализации
  isRecordingInitializing = false;
  // Сбрасываем медиа-рекордер
  mediaRecorder = null;
}

// Функция остановки записи аудио
function stopRecording() {
  try {
    // Скрываем маску при остановке записи
    hideRecordingMask();
    
    // Если инициализация все еще продолжается, подождем немного
    if (isRecordingInitializing) {
      console.log("Инициализация записи в процессе, ожидаем безопасной остановки...");
      
      // Создаем счетчик попыток остановки
      let retryCount = 0;
      const maxRetries = 10;
      
      const waitAndTryStop = () => {
        if (!isRecordingInitializing && mediaRecorder) {
          // Инициализация завершена и рекордер создан, можно останавливать
          actuallyStopRecording();
        } else if (retryCount < maxRetries) {
          // Пробуем еще раз через 100 мс
          retryCount++;
          setTimeout(waitAndTryStop, 100);
        } else {
          // Превышено максимальное количество попыток
          console.log("Превышено время ожидания инициализации записи");
          cleanupRecordingResources();
        }
      };
      
      // Запускаем проверку
      waitAndTryStop();
      return;
    }
    
    // Если медиа-рекордер не создан, просто очищаем ресурсы
    if (!mediaRecorder) {
      console.log("MediaRecorder не инициализирован, очищаем ресурсы");
      cleanupRecordingResources();
      return;
    }
    
    // Нормальная остановка записи
    actuallyStopRecording();
  } catch (error) {
    console.error("Ошибка в функции stopRecording:", error);
    // Скрываем маску при ошибке
    hideRecordingMask();
    cleanupRecordingResources();
  }
}

// Фактическая логика остановки записи
function actuallyStopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        try {
          // Формируем Blob из записанных данных
          const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
          const audioSize = audioBlob.size; // Размер в байтах
          const duration = ((performance.now() - lastTime) / 1000).toFixed(2); // Длительность в секундах

          // Очищаем ресурсы
          cleanupRecordingResources();

          console.log(
            `Запись полностью остановлена, микрофон освобожден. Размер аудио: ${audioSize} байт, Длительность: ${duration}с, Формат: ${audioBlob.type}`
          );

          // Передаём файл в функцию отправки
          sendToServer(audioBlob);
        } catch (innerError) {
          console.error("Ошибка в обработчике остановки записи:", innerError);
          cleanupRecordingResources();
        }
      };
    } else {
      cleanupRecordingResources();
    }
  } catch (err) {
    console.error("Ошибка в функции actuallyStopRecording:", err);
    cleanupRecordingResources();
  }
}

// Функция для очистки ресурсов записи
function cleanupRecordingResources() {
  try {
    // Останавливаем все треки потока
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }

    // Очищаем переменные
    audioStream = null;
    mediaRecorder = null;
    audioChunks = [];
    
    console.log("Ресурсы записи очищены");
  } catch (err) {
    console.error("Ошибка при очистке ресурсов:", err);
    // В любом случае сбрасываем переменные
    audioStream = null;
    mediaRecorder = null;
    audioChunks = [];
  }
}

// Функция для отправки и воспроизведения записи
async function sendToServer(audioBlob) {
  console.log(`Отправка аудио на сервер: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
  
  // Если включена отладка звука, воспроизводим запись
  if (settings.debugAudio === 'true') {
    console.log('Отладка звука включена, воспроизводим запись');
    playRecording(audioBlob);
  }
  
  // Проверяем, содержит ли аудио звук выше порога тишины
  const containsSound = await hasSound(audioBlob);
  console.log(`Проверка аудио на наличие звука: ${containsSound ? 'Звук обнаружен' : 'Тишина'}`);
  
  if (!containsSound) {
    console.log('Audio contains no speech, canceling API request');
    displayRecognizedText(i18n.getTranslation('speech_not_detected'));
    return;
  }
  
  // Отправляем запись в ElevenLabs API для преобразования речи в текст
  sendToElevenLabsAPI(audioBlob);
}

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
    // Создаем URL для Blob
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Проверяем, на какой странице мы находимся
    const isRestrictedPage = window.location.href.startsWith('chrome://') || 
                            window.location.href.startsWith('about:');
    
    if (isRestrictedPage) {
      // На защищенных страницах просто сохраняем файл
      console.log('Запись на системной странице. Создание элемента аудио невозможно из-за ограничений CSP.');
      // Предлагаем скачать файл
      downloadRecording(audioBlob);
      return;
    }
    
    // Безопасное удаление предыдущего контейнера (без innerHTML)
    const existingContainer = document.getElementById('audio-container');
    if (existingContainer) {
      while (existingContainer.firstChild) {
        existingContainer.removeChild(existingContainer.firstChild);
      }
    }
    
    // Создаем или получаем контейнер
    const audioContainer = existingContainer || createAudioContainer();
    
    // Создаем временный аудио элемент
    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = audioUrl;
    audioContainer.appendChild(audio);
    
    // Функция для безопасного удаления контейнера и освобождения ресурсов
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      if (audioContainer && audioContainer.parentNode) {
        audioContainer.remove();
      }
      // Удаляем все обработчики событий
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
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
    audioContainer.appendChild(infoDiv);
    
    // Добавляем кнопку скачивания
    const downloadButton = document.createElement('button');
    downloadButton.textContent = i18n.getTranslation('download_recording');
    downloadButton.onclick = () => downloadRecording(audioBlob);
    downloadButton.style.cssText = 'margin-top: 10px; padding: 5px 10px;';
    audioContainer.appendChild(downloadButton);
    
    // Автоматически воспроизводим
    audio.play().catch(err => console.log('Автоматическое воспроизведение не разрешено:', err));
  } catch (err) {
    console.error('Ошибка при воспроизведении записи:', err);
    // В случае ошибки предлагаем скачать файл
    downloadRecording(audioBlob);
  }
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

// Функция для проверки разрешений микрофона
async function checkMicrophonePermission() {
  try {
    // Запрашиваем доступ к микрофону
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    
    // Получаем список всех медиа устройств
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioDevices = devices.filter(device => device.kind === 'audioinput');
    
    console.log('=== Доступные аудио устройства ===');
    audioDevices.forEach((device, index) => {
      console.log(`Устройство ${index + 1}:`, {
        id: device.deviceId,
        label: device.label,
        groupId: device.groupId,
        kind: device.kind
      });
    });
    console.log('===============================');
    
    // Если успешно, сразу освобождаем ресурсы
    stream.getTracks().forEach(track => {
      console.log('Параметры аудио трека:', {
        label: track.label,
        id: track.id,
        enabled: track.enabled,
        muted: track.muted,
        readyState: track.readyState,
        constraints: track.getConstraints()
      });
      track.stop();
    });
    
    return {
      hasAccess: true
    };
  } catch (error) {
    // Возвращаем информацию об ошибке
    return {
      hasAccess: false,
      errorMessage: getErrorMessageForMicrophone(error)
    };
  }
}

// Функция для проверки знака препинания
function isPunctuationMark(char) {
  // Список знаков препинания (только точка, вопросительный и восклицательный знаки)
  const punctuationMarks = ['.', '!', '?'];
  return punctuationMarks.includes(char);
}

// Функция для подготовки текста с учетом контекста
function prepareTextForInsertion(text, beforeCursor) {
  // Логируем входящие параметры
  console.log(`prepareTextForInsertion: text="${text}", beforeCursor="${beforeCursor}"`);
  
  // Если текст пустой, нечего обрабатывать
  if (!text || !text.trim()) {
    console.log(`prepareTextForInsertion: возвращаем пустой текст="${text}"`);
    return text;
  }

  // Обрезаем лишние пробелы, переносы строк и др. в конце текста
  let trimmedText = text.replace(/^\s+/, '').replace(/\s+$/, '');
  console.log(`prepareTextForInsertion: после обрезки trimmedText="${trimmedText}"`);
  
  // Обрабатываем случай пустого контекста до курсора
  if (!beforeCursor || beforeCursor.trim() === '') {
    // Если текст начинается с новой мысли и мы в начале документа,
    // удаляем точку в конце, если она там есть
    if (trimmedText.endsWith('.')) {
      trimmedText = trimmedText.slice(0, -1);
      console.log(`prepareTextForInsertion: удалена точка в конце, trimmedText="${trimmedText}"`);
    }
    console.log(`prepareTextForInsertion: пустой контекст, возвращаем="${trimmedText}"`);
    return trimmedText;
  }
  
  // Проверяем, заканчивается ли текст переносом строки
  if (beforeCursor.endsWith('\n') || beforeCursor.endsWith('\r') || 
      beforeCursor.endsWith('\r\n') || beforeCursor.match(/\n\s*$/) || beforeCursor.match(/\r\s*$/)) {
    // Если перед курсором был перенос строки, не добавляем никаких разделителей
    console.log(`prepareTextForInsertion: обнаружен перенос строки, возвращаем="${trimmedText}"`);
    return trimmedText;
  }
  
  // Проверим последний символ перед курсором
  const lastChar = beforeCursor.charAt(beforeCursor.length - 1);
  console.log(`prepareTextForInsertion: последний символ="${lastChar}"`);
  
  // Если последний символ - знак препинания, добавляем пробел в начале
  if (isPunctuationMark(lastChar)) {
    const result = ' ' + trimmedText;
    console.log(`prepareTextForInsertion: после знака препинания, возвращаем="${result}"`);
    return result;
  } else {
    // Если последний символ не знак препинания (и контекст не пустой),
    // добавляем точку и пробел перед вставляемым текстом
    const result = '. ' + trimmedText;
    console.log(`prepareTextForInsertion: не после знака препинания, возвращаем="${result}"`);
    return result;
  }
}

// Настройки по умолчанию
let settings = {
  apiKey: '',
  languageCode: 'ru',
  tagAudioEvents: 'false',
  timestampsGranularity: 'none',
  diarize: 'false',
  numSpeakers: null,
  biasedKeywords: [],
  debugAudio: 'false',
  showRecordingMask: 'true'
};

// Загружаем настройки из хранилища при запуске
function loadSettings() {
  try {
    chrome.storage.sync.get({
      apiKey: '',
      languageCode: 'ru',
      tagAudioEvents: 'false',
      timestampsGranularity: 'none',
      diarize: 'false',
      numSpeakers: null,
      biasedKeywords: [],
      debugAudio: 'false',
      showRecordingMask: 'true'
    }, (items) => {
      settings = items;
      console.log("Настройки загружены:", JSON.stringify({
        apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
        languageCode: settings.languageCode,
        tagAudioEvents: settings.tagAudioEvents,
        timestampsGranularity: settings.timestampsGranularity,
        diarize: settings.diarize,
        numSpeakers: settings.numSpeakers,
        biasedKeywords: settings.biasedKeywords,
        debugAudio: settings.debugAudio,
        showRecordingMask: settings.showRecordingMask
      }));
    });
  } catch (error) {
    console.error("Ошибка при загрузке настроек:", error);
  }
}

// Загружаем настройки при инициализации
loadSettings();

// Слушаем изменения настроек
try {
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        if (changes.apiKey) {
          settings.apiKey = changes.apiKey.newValue;
        }
        if (changes.languageCode) {
          settings.languageCode = changes.languageCode.newValue;
        }
        if (changes.tagAudioEvents) {
          settings.tagAudioEvents = changes.tagAudioEvents.newValue;
        }
        if (changes.timestampsGranularity) {
          settings.timestampsGranularity = changes.timestampsGranularity.newValue;
        }
        if (changes.diarize) {
          settings.diarize = changes.diarize.newValue;
        }
        if (changes.numSpeakers) {
          settings.numSpeakers = changes.numSpeakers.newValue;
        }
        if (changes.biasedKeywords) {
          settings.biasedKeywords = changes.biasedKeywords.newValue;
        }
        if (changes.debugAudio) {
          settings.debugAudio = changes.debugAudio.newValue;
        }
        if (changes.showRecordingMask) {
          settings.showRecordingMask = changes.showRecordingMask.newValue;
        }
        console.log("Настройки обновлены:", JSON.stringify({
          apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
          languageCode: settings.languageCode,
          tagAudioEvents: settings.tagAudioEvents,
          timestampsGranularity: settings.timestampsGranularity,
          diarize: settings.diarize,
          numSpeakers: settings.numSpeakers,
          biasedKeywords: settings.biasedKeywords,
          debugAudio: settings.debugAudio,
          showRecordingMask: settings.showRecordingMask
        }));
      }
    });
    console.log("Слушатель изменений настроек успешно установлен");
  } else {
    console.warn("chrome.storage.onChanged API недоступен");
  }
} catch (error) {
  console.error("Ошибка при установке слушателя изменений настроек:", error);
}

// Определяем состояния
const States = {
  IDLE: "idle",
  PRESSED: "pressed",
  RELEASED: "released",
  HELD: "held",
};

// Определяем целевую клавишу в зависимости от платформы
const isMac = navigator.platform.toLowerCase().includes("mac");
const targetKey = isMac ? "Meta" : "Control";

// Порог для двойного нажатия (в миллисекундах)
const doublePressThreshold = 300;

// Переменные для записи аудио
let mediaRecorder = null;
let audioStream = null;
let audioChunks = []; // Для хранения частей записи

// Инициализация машины
let state = States.IDLE;
let lastTime = 0;
let lastKeyUpTime = 0;
let currentKey = null;

function resetToIdle() {
  state = States.IDLE;
  currentKey = null;
  lastTime = 0;
  lastKeyUpTime = 0;
}

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

// Флаг для отслеживания процесса инициализации записи
let isRecordingInitializing = false;

// Флаг для контроля создания MediaRecorder
let createMediaRecorderAllowed = false;


// Потеря фокуса окном бло
window.addEventListener('blur', () => {
  createMediaRecorderAllowed = false;
  console.log('Окно потеряло фокус, createMediaRecorderAllowed =', createMediaRecorderAllowed);
  
});

// Функция для создания и отображения маски записи
function showRecordingMask() {
  try {
    // Проверяем настройку отображения маски
    if (settings.showRecordingMask === 'false') {
      console.log('Отображение маски записи отключено в настройках');
      return;
    }

    // Проверяем, существует ли уже маска
    let mask = document.getElementById('recording-mask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'recording-mask';
      mask.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 0, 0.15);
        z-index: 2147483647;
        pointer-events: none;
        opacity: 0;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(mask);
      
      // Даем браузеру время на добавление элемента перед анимацией
      requestAnimationFrame(() => {
        mask.style.opacity = '1';
      });
    }
  } catch (error) {
    console.error('Ошибка при создании маски записи:', error);
  }
}

// Функция для изменения цвета маски на зеленый
function changeMaskToGreen() {
  try {
    // Проверяем настройку отображения маски
    if (settings.showRecordingMask === 'false') {
      return;
    }

    const mask = document.getElementById('recording-mask');
    if (mask) {
      mask.style.backgroundColor = 'rgba(0, 255, 0, 0.15)';
    }
  } catch (error) {
    console.error('Ошибка при изменении цвета маски:', error);
  }
}

// Функция для удаления маски записи
function hideRecordingMask() {
  try {
    // Проверяем настройку отображения маски
    if (settings.showRecordingMask === 'false') {
      return;
    }

    const mask = document.getElementById('recording-mask');
    if (mask) {
      // Плавно скрываем маску
      mask.style.opacity = '0';
      
      // Удаляем элемент после завершения анимации
      setTimeout(() => {
        if (mask && mask.parentNode) {
          mask.parentNode.removeChild(mask);
        }
      }, 300);
    }
  } catch (error) {
    console.error('Ошибка при удалении маски записи:', error);
  }
}

// Функция начала записи аудио
async function startRecording() {
  const startTime = performance.now();
  try {
    // Показываем маску в начале записи
    showRecordingMask();
    
    // Устанавливаем флаг, что запись инициализируется
    isRecordingInitializing = true;
    createMediaRecorderAllowed = true;
    
    // Получаем настройки микрофона
    const settingsStartTime = performance.now();
    const { preferredMicrophoneId } = await new Promise((resolve) => {
      chrome.storage.sync.get({ preferredMicrophoneId: '' }, resolve);
    });
    console.log(`Время получения настроек: ${(performance.now() - settingsStartTime).toFixed(1)}мс`);

    // Пробуем сначала использовать предпочитаемый микрофон, если он задан
    const getUserMediaStartTime = performance.now();
    if (preferredMicrophoneId) {
      try {
        console.log("Пробуем использовать предпочитаемый микрофон");
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: { exact: preferredMicrophoneId },
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 22050,        // Уменьшаем частоту дискретизации
            channelCount: 1           // Используем моно вместо стерео
          }
        });
        console.log(`Время получения потока с предпочитаемого микрофона: ${(performance.now() - getUserMediaStartTime).toFixed(1)}мс`);
        
        // Анализируем полученный поток
        const audioTrack = audioStream.getAudioTracks()[0];
        const trackSettings = audioTrack.getSettings();
        const trackCapabilities = audioTrack.getCapabilities();
        console.log('Параметры аудиопотока:', {
          deviceId: trackSettings.deviceId,
          groupId: trackSettings.groupId,
          sampleRate: trackSettings.sampleRate,
          channelCount: trackSettings.channelCount,
          autoGainControl: trackSettings.autoGainControl,
          echoCancellation: trackSettings.echoCancellation,
          noiseSuppression: trackSettings.noiseSuppression,
          latency: trackSettings.latency,
          время: `${(performance.now() - getUserMediaStartTime).toFixed(1)}мс`
        });
      } catch (err) {
        const fallbackStartTime = performance.now();
        console.log("Не удалось использовать предпочитаемый микрофон, пробуем микрофон по умолчанию:", err);
        // Если не удалось использовать предпочитаемый микрофон, пробуем использовать любой доступный
        audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            sampleRate: 22050,        // Уменьшаем частоту дискретизации
            channelCount: 1           // Используем моно вместо стерео
          } 
        });
        console.log(`Время получения потока с микрофона по умолчанию после ошибки: ${(performance.now() - fallbackStartTime).toFixed(1)}мс`);
        
        // Анализируем полученный поток после fallback
        const audioTrack = audioStream.getAudioTracks()[0];
        const trackSettings = audioTrack.getSettings();
        const trackCapabilities = audioTrack.getCapabilities();
        console.log('Параметры аудиопотока (fallback):', {
          deviceId: trackSettings.deviceId,
          groupId: trackSettings.groupId,
          sampleRate: trackSettings.sampleRate,
          channelCount: trackSettings.channelCount,
          autoGainControl: trackSettings.autoGainControl,
          echoCancellation: trackSettings.echoCancellation,
          noiseSuppression: trackSettings.noiseSuppression,
          latency: trackSettings.latency,
          время: `${(performance.now() - fallbackStartTime).toFixed(1)}мс`
        });
      }
    } else {
      // Если предпочитаемый микрофон не задан, используем микрофон по умолчанию
      audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 22050,        // Уменьшаем частоту дискретизации
          channelCount: 1           // Используем моно вместо стерео
        } 
      });
      console.log(`Время получения потока с микрофона по умолчанию: ${(performance.now() - getUserMediaStartTime).toFixed(1)}мс`);
      
      // Анализируем полученный поток
      const audioTrack = audioStream.getAudioTracks()[0];
      const trackSettings = audioTrack.getSettings();
      const trackCapabilities = audioTrack.getCapabilities();
      console.log('Параметры аудиопотока (default):', {
        deviceId: trackSettings.deviceId,
        groupId: trackSettings.groupId,
        sampleRate: trackSettings.sampleRate,
        channelCount: trackSettings.channelCount,
        autoGainControl: trackSettings.autoGainControl,
        echoCancellation: trackSettings.echoCancellation,
        noiseSuppression: trackSettings.noiseSuppression,
        latency: trackSettings.latency,
        время: `${(performance.now() - getUserMediaStartTime).toFixed(1)}мс`
      });
    }
    
    // Проверяем флаг после получения разрешения
    if (!createMediaRecorderAllowed) {
      console.log('Разрешение получено, но окно потеряло фокус. Прерываем создание MediaRecorder');
      // Освобождаем ресурсы
      audioStream.getTracks().forEach(track => track.stop());
      audioStream = null;
      isRecordingInitializing = false;
    } else {
      const recorderStartTime = performance.now();
      // Выбираем поддерживаемый формат
      const mimeType = getSupportedMimeType();
      
      // Создаем MediaRecorder с подходящим форматом
      mediaRecorder = mimeType 
        ? new MediaRecorder(audioStream, { mimeType }) 
        : new MediaRecorder(audioStream);
      
      audioChunks = []; // Очищаем массив перед новой записью

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
      
      
      // просим присылать фрагменты каждые 1000 миллисекунд
      mediaRecorder.start(100);
      
      // Меняем цвет маски на зеленый после успешного запуска MediaRecorder
      changeMaskToGreen();
   
      console.log(`Время создания и запуска MediaRecorder: ${(performance.now() - recorderStartTime).toFixed(1)}мс`);
      console.log(`Запись начата в формате: ${mediaRecorder.mimeType}`);
      
      // Логируем информацию о выбранном устройстве
      const audioTrack = audioStream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log("Используется микрофон:", settings.deviceId, 
                    "Метка:", audioTrack.label);
      }
    }

    console.log(`Общее время инициализации записи: ${(performance.now() - startTime).toFixed(1)}мс`);
  } catch (err) {
    console.error("Ошибка при запуске записи:", err);
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
function sendToServer(audioBlob) {
  console.log(`Отправка аудио на сервер: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
  
  // Если включена отладка звука, воспроизводим запись
  if (settings.debugAudio === 'true') {
    console.log('Отладка звука включена, воспроизводим запись');
    playRecording(audioBlob);
  }
  
  // Отправляем запись в ElevenLabs API для преобразования речи в текст
  sendToElevenLabsAPI(audioBlob);
}

// Функция для отправки аудио в ElevenLabs API
async function sendToElevenLabsAPI(audioBlob) {
  try {
    // Убедимся, что у нас есть запись
    if (!audioBlob || audioBlob.size === 0) {
      console.error("Пустая запись, нечего отправлять в API");
      return;
    }
    
    // Проверяем наличие API ключа
    if (!settings.apiKey) {
      console.warn("API ключ ElevenLabs не предоставлен");
      displayRecognizedText("Пожалуйста, укажите API ключ ElevenLabs в настройках расширения");
      return;
    }
    
    console.log("Отправка аудио в ElevenLabs API для распознавания речи...");
    
    // ElevenLabs API endpoint для Speech-to-Text
    // Документация: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
    const apiUrl = "https://api.elevenlabs.io/v1/speech-to-text";
    
    // Создаем FormData для отправки аудио
    const formData = new FormData();
    
    // Обязательные параметры
    formData.append('model_id', 'scribe_v1'); // Единственная доступная модель
    formData.append('file', audioBlob, `recording.${getFileExtension(audioBlob.type)}`);
    
    // Добавляем пользовательские настройки
    formData.append('tag_audio_events', settings.tagAudioEvents);
    
    // Добавляем код языка, если он задан
    if (settings.languageCode) {
      formData.append('language_code', settings.languageCode);
    }

    // Добавляем детализацию временных меток
    if (settings.timestampsGranularity && settings.timestampsGranularity !== 'none') {
      formData.append('timestamps_granularity', settings.timestampsGranularity);
    }

    // Добавляем разметку говорящих
    if (settings.diarize === 'true') {
      formData.append('diarize', true);
    }

    // Добавляем количество говорящих, если указано
    if (settings.numSpeakers) {
      formData.append('num_speakers', parseInt(settings.numSpeakers));
    }

    // Добавляем ключевые слова, если есть
    if (settings.biasedKeywords && settings.biasedKeywords.length > 0) {
      formData.append('biased_keywords', JSON.stringify(settings.biasedKeywords));
    }
    
    // Отправляем запрос
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': settings.apiKey,
        // Content-Type будет установлен автоматически при использовании FormData
      },
      body: formData
    });
    
    // Обрабатываем ответ
    if (response.ok) {
      const result = await response.json();
      console.log("Распознавание успешно:", result);
      
      // Отображаем распознанный текст
      displayRecognizedText(result.text || "Текст не распознан");
      
      // Также воспроизводим запись локально
      // playRecording(audioBlob);
    } else {
      // Обрабатываем ошибку, пытаемся извлечь сообщение из JSON
      try {
        // Пробуем сначала получить JSON
        const errorText = await response.text();
        console.error("Ошибка распознавания:", response.status, errorText);
        
        // Пытаемся разобрать JSON, чтобы извлечь сообщение об ошибке
        try {
          const errorJson = JSON.parse(errorText);
          
          // Проверяем разные возможные структуры JSON ошибки
          let errorMessage = "";
          
          // Структура как в примере с unusual_activity
          if (errorJson.detail && errorJson.detail.message) {
            errorMessage = errorJson.detail.message;
          } 
          // Общая структура для многих API
          else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          // Структура с error и message
          else if (errorJson.error && errorJson.error.message) {
            errorMessage = errorJson.error.message;
          }
          // Структура с errors массивом
          else if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].message || JSON.stringify(errorJson.errors);
          }
          
          // Если удалось извлечь сообщение, отображаем его как распознанный текст
          if (errorMessage) {
            console.log("Извлечено сообщение об ошибке:", errorMessage);
            displayRecognizedText(errorMessage);
          } else {
            // Если сообщение не удалось извлечь, но JSON есть
            displayRecognizedText("Ошибка API: " + JSON.stringify(errorJson));
          }
        } catch (jsonError) {
          // Если не удалось разобрать JSON, используем текст ошибки как есть
          console.log("Не удалось разобрать ответ как JSON:", jsonError);
          displayRecognizedText("Ошибка API: " + errorText);
        }
      } catch (textError) {
        // В случае ошибки при получении текста ответа
        console.error("Не удалось получить текст ошибки:", textError);
        displayRecognizedText("Ошибка API: " + response.status);
      }
      
      // При ошибке воспроизводим аудио локально
      // playRecording(audioBlob);
    }
  } catch (error) {
    console.error("Ошибка при отправке в API:", error);
    
    // При исключении воспроизводим аудио локально
    // playRecording(audioBlob);
  }
}

// Функция для копирования текста в буфер обмена
async function copyToClipboard(text) {
  try {
    // Проверяем поддержку API
    if (!navigator.clipboard) {
      throw new Error('Clipboard API не поддерживается');
    }

    // Пробуем скопировать текст
    await navigator.clipboard.writeText(text);
    
    // Показываем уведомление об успешном копировании
    showCopyNotification('Текст скопирован в буфер обмена');
    return true;
  } catch (error) {
    console.error('Ошибка при копировании в буфер обмена:', error);
    
    // Пробуем запасной метод через execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        showCopyNotification('Текст скопирован в буфер обмена');
        return true;
      } else {
        throw new Error('execCommand copy не сработал');
      }
    } catch (fallbackError) {
      console.error('Ошибка при использовании запасного метода копирования:', fallbackError);
      showCopyNotification('Не удалось скопировать текст', true);
      return false;
    }
  }
}

// Функция для показа уведомления
function showCopyNotification(message, isError = false) {
  try {
    console.log(message);
  } catch (error) {
    console.error('Ошибка при показе уведомления:', error);
  }
}

// Функция для вставки распознанного текста с поддержкой отмены (Cmd+Z)
function displayRecognizedText(text) {
  try {
    // Проверяем, на какой странице мы находимся
    const isRestrictedPage = window.location.href.startsWith('chrome://') || 
                            window.location.href.startsWith('about:');
    
    if (isRestrictedPage) {
      console.log('Распознанный текст:', text);
      return; // На системных страницах только логируем
    }
    
    // Получаем активный элемент (элемент в фокусе)
    const activeElement = document.activeElement;
    
    // Проверяем, является ли активный элемент текстовым полем или contenteditable
    if (activeElement && (
        // Обычные текстовые поля
        (activeElement.tagName === 'INPUT' && 
         (activeElement.type === 'text' || activeElement.type === 'search' || activeElement.type === '')) ||
        activeElement.tagName === 'TEXTAREA' ||
        // Элементы с contenteditable
        (activeElement.getAttribute('contenteditable') === 'true')
    )) {
      
      // Обработка для contenteditable элементов
      if (activeElement.getAttribute('contenteditable') === 'true') {
        try {
          // Получаем текущее выделение
          const selection = window.getSelection();
          
          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            
            // Находим ближайший div-контейнер для текущей позиции курсора
            let currentNode = range.startContainer;
            let closestDiv = null;
            
            // Ищем ближайший div, двигаясь вверх по DOM-дереву
            while (currentNode && currentNode !== activeElement) {
                if (currentNode.nodeType === Node.ELEMENT_NODE && 
                    currentNode.tagName && currentNode.tagName.toLowerCase() === 'div') {
                    closestDiv = currentNode;
                    break;
                }
                currentNode = currentNode.parentNode;
            }
            
            // Определяем, откуда начинать поиск текста до курсора
            const startContainer = closestDiv || activeElement;
            
            // Получаем текст до курсора в пределах найденного div или всего contenteditable
            const beforeCursorRange = range.cloneRange();
            if (startContainer === activeElement) {
                // Если div не найден, используем весь contenteditable как и раньше
                beforeCursorRange.setStart(startContainer, 0);
            } else {
                // Используем найденный div как начальную точку
                try {
                    // Пытаемся установить начало в начало div-а
                    beforeCursorRange.setStart(startContainer, 0);
                } catch (e) {
                    console.error("Ошибка при установке начала диапазона:", e);
                    // Запасной вариант - используем весь contenteditable
                    beforeCursorRange.setStart(activeElement, 0);
                }
            }
            
            const beforeCursorText = beforeCursorRange.toString();
            console.log("Контекст до курсора (в пределах ближайшего div):", beforeCursorText);
            
            // Подготавливаем текст с учетом контекста
            const preparedText = prepareTextForInsertion(text, beforeCursorText);
            
            // Используем Document.execCommand для поддержки отмены
            document.execCommand('insertText', false, preparedText);
            
            console.log('Текст вставлен в contenteditable элемент с поддержкой отмены');
          } else {
            console.log('Не удалось найти позицию курсора в contenteditable элементе');
          }
        } catch (err) {
          console.error('Ошибка при вставке в contenteditable:', err);
          
          // Пробуем запасной метод
          try {
            // Получаем текущее выделение
            const selection = window.getSelection();
            
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              
              // Получаем текст до курсора для проверки знаков препинания
              const beforeCursorRange = range.cloneRange();
              beforeCursorRange.setStart(activeElement, 0);
              const beforeCursorText = beforeCursorRange.toString();
              
              // Подготавливаем текст с учетом контекста
              const preparedText = prepareTextForInsertion(text, beforeCursorText);
              
              // Физически вставляем текст через DOM API
              range.deleteContents(); // Удаляем выделенное, если есть
              const textNode = document.createTextNode(preparedText);
              range.insertNode(textNode);
              
              // Устанавливаем курсор после вставленного текста
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              selection.removeAllRanges();
              selection.addRange(range);
              
              // Генерируем событие input для уведомления о вставке
              const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
              });
              activeElement.dispatchEvent(inputEvent);
              
              console.log('Текст вставлен в contenteditable элемент (запасной метод)');
            }
          } catch (backupErr) {
            console.error('Ошибка при использовании запасного метода:', backupErr);
            console.log('Распознанный текст:', text);
          }
        }
      } else {
        // Для обычных полей ввода (input, textarea)
        try {
          // Сохраняем текущие позиции, чтобы мы могли восстановить курсор после вставки
          const startPos = activeElement.selectionStart;
          const endPos = activeElement.selectionEnd;
          
          // Получаем текст до курсора
          const beforeCursorText = activeElement.value.substring(0, startPos);
          
          // Подготавливаем текст с учетом контекста
          const preparedText = prepareTextForInsertion(text, beforeCursorText);
          
          // Используем Document.execCommand для поддержки отмены
          // Сначала устанавливаем фокус на элемент
          activeElement.focus();
          
          // Если есть выделение, удаляем его с поддержкой отмены
          if (startPos !== endPos) {
            document.execCommand('delete', false);
          }
          
          // Вставляем подготовленный текст с поддержкой отмены
          document.execCommand('insertText', false, preparedText);
          
          console.log('Текст вставлен в текстовое поле с поддержкой отмены');
        } catch (err) {
          console.error('Ошибка при использовании execCommand:', err);
          
          // Запасной метод с использованием setRangeText или прямой вставки
          try {
            if (typeof activeElement.setRangeText === 'function') {
              // Получаем текст до курсора
              const beforeCursorText = activeElement.value.substring(0, activeElement.selectionStart);
              
              // Подготавливаем текст с учетом контекста
              const preparedText = prepareTextForInsertion(text, beforeCursorText);
              
              // Сохраняем состояние для истории отмены
              const oldValue = activeElement.value;
              
              // Используем setRangeText для вставки в текущую позицию
              activeElement.setRangeText(preparedText, activeElement.selectionStart, activeElement.selectionEnd, 'end');
              
              // Создаем событие input для уведомления о вставке текста
              const inputEvent = new InputEvent('input', { 
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: preparedText
              });
              activeElement.dispatchEvent(inputEvent);
              
              console.log('Текст вставлен в текущую позицию курсора с помощью setRangeText');
            } else {
              // Запасной вариант для старых браузеров
              const startPos = activeElement.selectionStart;
              const endPos = activeElement.selectionEnd;
              
              // Получаем текст до курсора
              const beforeCursorText = activeElement.value.substring(0, startPos);
              
              // Подготавливаем текст с учетом контекста
              const preparedText = prepareTextForInsertion(text, beforeCursorText);
              
              // Сохраняем состояние для истории отмены (если возможно)
              const oldValue = activeElement.value;
              
              // Ручная вставка текста
              const newValue = beforeCursorText + 
                preparedText + 
                activeElement.value.substring(endPos);
              
              // Устанавливаем новое значение
              activeElement.value = newValue;
              
              // Устанавливаем курсор после вставленного текста
              activeElement.selectionStart = activeElement.selectionEnd = startPos + preparedText.length;
              
              // Создаем событие input для уведомления о вставке текста
              const inputEvent = new InputEvent('input', { 
                bubbles: true,
                cancelable: true,
                inputType: 'insertText',
                data: preparedText
              });
              activeElement.dispatchEvent(inputEvent);
              
              console.log('Текст вставлен в текущую позицию курсора (запасной метод)');
            }
          } catch (backupErr) {
            console.error('Ошибка при использовании запасного метода:', backupErr);
            console.log('Распознанный текст:', text);
          }
        }
      }
    } else {
      // Если нет подходящего поля в фокусе, копируем в буфер обмена
      copyToClipboard(text);
    }
  } catch (err) {
    console.error('Ошибка при обработке текста:', err);
    // Пробуем скопировать в буфер обмена даже при ошибке
    copyToClipboard(text);
  }
}

// Функция для определения расширения файла по MIME-типу
function getFileExtension(mimeType) {
  const extensions = {
    'audio/mp4': 'mp4',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav'
  };
  
  const type = mimeType.split(';')[0];
  return extensions[type] || 'bin';
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
    infoDiv.textContent = `Формат: ${audioBlob.type}, Размер: ${(audioBlob.size / 1024).toFixed(1)} КБ`;
    audioContainer.appendChild(infoDiv);
    
    // Добавляем кнопку скачивания
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'Скачать запись';
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
      header.textContent = 'Записанное аудио';
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

// Обработчик keydown
document.addEventListener("keydown", (event) => {
  const currentTime = performance.now();

  if (event.key !== targetKey) {
    if (state !== States.IDLE) {
      console.log(`Нажата не целевая клавиша: ${event.key}, Сброс в Idle`);
      if (state === States.HELD) {
        stopRecording();
      }
      resetToIdle();
    }
    return;
  }

  switch (state) {
    case States.IDLE:
      state = States.PRESSED;
      currentKey = event.key;
      lastTime = currentTime;
      console.log(`Нажатие: ${event.key} (Pressed)`);
      break;

    case States.RELEASED:
      if (currentTime - lastKeyUpTime <= doublePressThreshold) {
        state = States.HELD;
        lastTime = currentTime;
        console.log(`Нажатие: ${event.key} (Удержание - Обнаружено двойное нажатие)`);
        startRecording();
      } else {
        state = States.PRESSED;
        lastTime = currentTime;
        console.log(`Нажатие: ${event.key} (Pressed - Слишком медленно)`);
      }
      break;

    case States.PRESSED:
    case States.HELD:
      break;

    default:
      break;
  }
});

// Обработчик keyup
document.addEventListener("keyup", (event) => {
  const keyUpTime = performance.now();

  if (event.key !== targetKey) {
    if (state !== States.IDLE) {
      console.log(`Отпущена не целевая клавиша: ${event.key}, Сброс в Idle`);
      if (state === States.HELD) {
        stopRecording();
      }
      resetToIdle();
    }
    return;
  }

  if (event.key === currentKey) {
    switch (state) {
      case States.PRESSED:
        state = States.RELEASED;
        lastKeyUpTime = keyUpTime;
        const duration = (keyUpTime - lastTime).toFixed(2);
        console.log(`Отпускание: ${event.key}, Время удержания: ${duration}мс (Released)`);
        break;

      case States.HELD:
        state = States.IDLE;
        const heldDuration = (keyUpTime - lastTime).toFixed(2);
        console.log(`Отпускание: ${event.key}, Время удержания в Held: ${heldDuration}мс`);
        stopRecording();
        resetToIdle();
        break;

      default:
        break;
    }
  }
});


// Обработчик сообщений от popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Получено сообщение в content script:", request);
  
  if (request.command === "checkMicrophoneStatus") {
    // Проверяем доступ к микрофону
    checkMicrophonePermission()
      .then(result => {
        console.log("Результат проверки доступа к микрофону:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("Ошибка при проверке доступа к микрофону:", error);
        sendResponse({
          hasAccess: false,
          errorMessage: getErrorMessageForMicrophone(error)
        });
      });
      
    // Необходимо вернуть true для асинхронной отправки ответа
    return true;
  }
});

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

// Функция для получения понятного сообщения об ошибке
function getErrorMessageForMicrophone(error) {
  if (!error) {
    return "Неизвестная ошибка";
  }
  
  if (error.name) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Доступ к микрофону запрещен";
        
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Микрофон не найден";
        
      case "NotReadableError":
      case "TrackStartError":
        return "Микрофон занят другим приложением";
        
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return "Технические ограничения микрофона";
        
      case "TypeError":
        return "Неверный тип данных при запросе микрофона";
        
      default:
        return `Ошибка микрофона: ${error.name}`;
    }
  }
  
  return error.message || "Неизвестная ошибка доступа к микрофону";
}
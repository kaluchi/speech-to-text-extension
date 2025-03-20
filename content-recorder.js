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
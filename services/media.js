/**
 * Сервис для работы с медиа (аудио, микрофон, запись)
 */
class PageObjectMediaService {
  // Константы для типов MIME
  static MIME_TYPE = {
    MP4: 'audio/mp4',
    WEBM: 'audio/webm',
    WEBM_OPUS: 'audio/webm;codecs=opus',
    OGG_OPUS: 'audio/ogg;codecs=opus',
    DEFAULT: 'audio/webm'
  };
  
  // Константы для ошибок микрофона
  static ERROR_TYPE = {
    NOT_ALLOWED: 'NotAllowedError',
    PERMISSION_DENIED: 'PermissionDeniedError',
    NOT_FOUND: 'NotFoundError',
    DEVICES_NOT_FOUND: 'DevicesNotFoundError',
    NOT_READABLE: 'NotReadableError',
    TRACK_START_ERROR: 'TrackStartError',
    OVERCONSTRAINED: 'OverconstrainedError',
    CONSTRAINT_NOT_SATISFIED: 'ConstraintNotSatisfiedError',
    TYPE_ERROR: 'TypeError'
  };
  
  // Константы для состояний записи
  static RECORDER_STATE = {
    INACTIVE: 'inactive'
  };
  
  // Константы для типов устройств
  static DEVICE_TYPE = {
    AUDIO_INPUT: 'audioinput'
  };
  

  
  constructor(pageObject) {
    this._page = pageObject;
    this._stream = null;
    this._recorder = null;
    this._chunks = [];
    this._isRecording = false;
    this._isInitializing = false;
    this._baseAudioConstraints = {
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
      sampleRate: 22050,
      channelCount: 1
    };
  }

  /**
   * Инициализация сервиса
   */
  init() {
    const { logger, chrome } = this._page;
    
    logger.info('Инициализация медиа сервиса');
    
    // Регистрация обработчика сообщений для проверки микрофона
    chrome.onMessage('checkMicrophoneStatus', async () => {
      logger.info("Получен запрос на проверку статуса микрофона");
      return await this.checkMicrophonePermission();
    });
  }

  /**
   * Получение аудиопотока с микрофона
   * @param {string} preferredDeviceId - Предпочитаемый ID устройства
   * @returns {Promise<MediaStream>} - Promise с медиапотоком
   */
  async getAudioStream(preferredDeviceId = null) {
    const { logger } = this._page;
    const { ERROR_TYPE } = PageObjectMediaService;
    
    try {
      this._isInitializing = true;
      
      // Настраиваем ограничения для аудио
      const constraints = {
        audio: { ...this._baseAudioConstraints }
      };
      
      // Добавляем ID предпочитаемого устройства, если оно указано
      if (preferredDeviceId) {
        logger.debug("Пробуем использовать предпочитаемый микрофон:", preferredDeviceId);
        constraints.audio.deviceId = { exact: preferredDeviceId };
      } else {
        logger.debug("Используем микрофон по умолчанию");
      }
      
      // Получаем поток
      this._stream = await navigator.mediaDevices.getUserMedia(constraints).catch(err => {
        // Если не удалось получить указанное устройство, пробуем любое доступное
        if (preferredDeviceId && err.name === ERROR_TYPE.OVERCONSTRAINED) {
          logger.warn("Не удалось использовать предпочитаемый микрофон, пробуем микрофон по умолчанию");
          return navigator.mediaDevices.getUserMedia({ audio: this._baseAudioConstraints });
        }
        throw err;
      });
      
      // Логируем информацию о потоке и возвращаем его
      this._logStreamInfo(preferredDeviceId ? "preferred" : "default");
      this._isInitializing = false;
      return this._stream;
    } catch (error) {
      this._isInitializing = false;
      logger.error("Ошибка при получении аудиопотока:", error);
      throw error;
    }
  }

  /**
   * Получение списка аудиоустройств
   * @returns {Promise<Array>} - Promise со списком устройств
   */
  async listAudioDevices() {
    const { logger } = this._page;
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === PageObjectMediaService.DEVICE_TYPE.AUDIO_INPUT);
    } catch (error) {
      logger.error("Ошибка при получении списка устройств:", error);
      return [];
    }
  }

  /**
   * Проверка разрешений для микрофона
   * @returns {Promise<Object>} - Promise с результатом проверки
   */
  async checkMicrophonePermission() {
    const { logger } = this._page;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true});
      const devices = await this.listAudioDevices();
      
      // Логирование устройств
      logger.info('=== Доступные аудио устройства ===');
      devices.forEach((device, index) => {
        const { deviceId, label, groupId, kind } = device;
        logger.info(`Устройство ${index + 1}:`, {
          id: deviceId,
          label,
          groupId,
          kind
        });
      });
      
      // Освобождаем ресурсы
      this.stopAudioTracks(stream);
      
      return { hasAccess: true };
    } catch (error) {
      return {
        hasAccess: false,
        errorMessage: this._getErrorMessageForMicrophone(error)
      };
    }
  }

  /**
   * Получение понятного сообщения об ошибке микрофона
   * @param {Error} error - Объект ошибки
   * @returns {string} - Сообщение об ошибке
   * @private
   */
  _getErrorMessageForMicrophone(error) {
    const { i18n } = this._page;
    const { ERROR_TYPE } = PageObjectMediaService;
    
    if (!error) {
      return i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
    }
    
    if (error.name) {
      switch (error.name) {
        case ERROR_TYPE.NOT_ALLOWED:
        case ERROR_TYPE.PERMISSION_DENIED:
          return i18n.getTranslation('mic_access_denied') || 'Доступ к микрофону запрещен';
          
        case ERROR_TYPE.NOT_FOUND:
        case ERROR_TYPE.DEVICES_NOT_FOUND:
          return i18n.getTranslation('mic_not_found') || 'Микрофон не найден';
          
        case ERROR_TYPE.NOT_READABLE:
        case ERROR_TYPE.TRACK_START_ERROR:
          return i18n.getTranslation('mic_in_use') || 'Микрофон используется другим приложением';
          
        case ERROR_TYPE.OVERCONSTRAINED:
        case ERROR_TYPE.CONSTRAINT_NOT_SATISFIED:
          return i18n.getTranslation('technical_limitations') || 'Технические ограничения';
          
        case ERROR_TYPE.TYPE_ERROR:
          return i18n.getTranslation('incorrect_data_type') || 'Некорректный тип данных';
          
        default:
          return i18n.getTranslation('unknown_mic_error', error.name) || 
                 `Неизвестная ошибка микрофона: ${error.name}`;
      }
    }
    
    return error.message || i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
  }

  /**
   * Создание и настройка MediaRecorder
   * @param {MediaStream} stream - Медиапоток
   * @param {string} mimeType - MIME-тип записи
   * @returns {MediaRecorder} - Созданный MediaRecorder
   */
  createRecorder(stream = null, mimeType = null) {
    const { logger } = this._page;
    
    const targetStream = stream || this._stream;
    if (!targetStream) {
      throw new Error('Аудиопоток не доступен. Сначала получите поток через getAudioStream()');
    }
    
    // Выбираем поддерживаемый формат, если не указан
    if (!mimeType) {
      mimeType = this.getSupportedMimeType();
    }
    
    // Создаем MediaRecorder
    this._recorder = mimeType 
      ? new MediaRecorder(targetStream, { mimeType }) 
      : new MediaRecorder(targetStream);
    
    this._chunks = []; // Очищаем массив перед новой записью
    
    return this._recorder;
  }

  /**
   * Начало записи
   * @param {number} timeslice - Интервал для событий dataavailable в мс
   * @returns {boolean} - true, если запись началась
   */
  startRecording(timeslice = 100) {
    const { logger } = this._page;
    
    if (!this._recorder) {
      logger.error("MediaRecorder не инициализирован");
      return false;
    }
    
    try {
      this._recorder.start(timeslice);
      this._isRecording = true;
      logger.info(`Запись начата в формате: ${this._recorder.mimeType}`);
      return true;
    } catch (error) {
      logger.error("Ошибка при запуске записи:", error);
      return false;
    }
  }

  /**
   * Остановка записи
   * @returns {boolean} - true, если запись остановлена
   */
  stopRecording() {
    const { logger } = this._page;
    const { RECORDER_STATE } = PageObjectMediaService;
    
    if (!this._recorder || this._recorder.state === RECORDER_STATE.INACTIVE) {
      logger.warn("MediaRecorder не активен");
      this.stopAudioTracks();
      return false;
    }
    
    try {
      this._recorder.stop();
      this._isRecording = false;
      logger.info("Запись остановлена");
      return true;
    } catch (error) {
      logger.error("Ошибка при остановке записи:", error);
      this.stopAudioTracks();
      return false;
    }
  }

  /**
   * Остановка аудиотреков и освобождение ресурсов
   * @param {MediaStream} stream - Медиапоток (если не указан, используется this._stream)
   */
  stopAudioTracks(stream = null) {
    const { logger } = this._page;
    
    const targetStream = stream || this._stream;
    if (targetStream) {
      targetStream.getTracks().forEach(track => {
        track.stop();
        logger.debug(`Трек остановлен: ${track.label}`);
      });
    }
    
    if (!stream) {
      this._stream = null;
      this._recorder = null;
      this._isRecording = false;
    }
  }

  /**
   * Получение записанных данных в виде Blob
   * @param {Object} options - Опции для создания Blob
   * @returns {Blob|null} - Blob с записью или null
   */
  getRecordedBlob(options = {}) {
    const { logger } = this._page;
    const { MIME_TYPE } = PageObjectMediaService;
    
    if (this._chunks.length === 0) {
      logger.info("Нет записанных данных");
      return null;
    }
    
    // Проверяем, есть ли в массиве непустые чанки
    const validChunks = this._chunks.filter(chunk => chunk.size > 0);
    
    if (validChunks.length === 0) {
      logger.info("Все записанные части пусты");
      return null;
    }
    
    const mimeType = this._recorder ? this._recorder.mimeType : MIME_TYPE.DEFAULT;
    return new Blob(validChunks, { type: mimeType, ...options });
  }

  /**
   * Добавление обработчика получения данных
   * @param {Function} handler - Обработчик
   */
  onDataAvailable(handler) {
    const { logger } = this._page;
    
    if (!this._recorder) {
      logger.error("MediaRecorder не инициализирован");
      return;
    }
    
    this._recorder.ondataavailable = (event) => {
      this._chunks.push(event.data);
      handler(event);
    };
  }

  /**
   * Добавление обработчика остановки записи
   * @param {Function} handler - Обработчик
   */
  onRecordingStop(handler) {
    const { logger } = this._page;
    
    if (!this._recorder) {
      logger.error("MediaRecorder не инициализирован");
      return;
    }
    
    this._recorder.onstop = handler;
  }

  /**
   * Добавление обработчика ошибок записи
   * @param {Function} handler - Обработчик
   */
  onRecordingError(handler) {
    const { logger } = this._page;
    
    if (!this._recorder) {
      logger.error("MediaRecorder не инициализирован");
      return;
    }
    
    this._recorder.onerror = handler;
  }

  /**
   * Определение поддерживаемого MIME-типа
   * @returns {string} - Поддерживаемый MIME-тип
   */
  getSupportedMimeType() {
    const { logger } = this._page;
    const { MIME_TYPE } = PageObjectMediaService;
    
    const possibleTypes = [
      MIME_TYPE.MP4,
      MIME_TYPE.WEBM,
      MIME_TYPE.WEBM_OPUS,
      MIME_TYPE.OGG_OPUS
    ];
    
    for (const type of possibleTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        logger.info(`Браузер поддерживает формат записи: ${type}`);
        return type;
      }
    }
    
    logger.warn('Указанные форматы не поддерживаются, используем формат по умолчанию');
    return '';
  }

  /**
   * Проверка, идет ли запись
   * @returns {boolean} - true, если запись идет
   */
  isRecording() {
    return this._isRecording;
  }

  /**
   * Проверка, идет ли инициализация
   * @returns {boolean} - true, если идет инициализация
   */
  isInitializing() {
    return this._isInitializing;
  }

  /**
   * Логирование информации о потоке
   * @param {string} sourceType - Тип источника
   * @private
   */
  _logStreamInfo(sourceType) {
    const { logger } = this._page;
    
    if (!this._stream) return;
    
    const audioTrack = this._stream.getAudioTracks()[0];
    if (audioTrack) {
      const { 
        deviceId, 
        groupId, 
        sampleRate, 
        channelCount, 
        autoGainControl, 
        echoCancellation, 
        noiseSuppression, 
        latency 
      } = audioTrack.getSettings();
      
      logger.debug(`Параметры аудиопотока (${sourceType}):`, {
        deviceId,
        groupId,
        sampleRate,
        channelCount,
        autoGainControl,
        echoCancellation,
        noiseSuppression,
        latency
      });
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectMediaService = PageObjectMediaService;
/**
 * Сервис для работы с медиа (аудио, микрофон, запись)
 */
class PageObjectMediaService {
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
    // Пустой метод для соответствия интерфейсу сервиса
  }

  /**
   * Получение аудиопотока с микрофона
   * @param {string} preferredDeviceId - Предпочитаемый ID устройства
   * @returns {Promise<MediaStream>} - Promise с медиапотоком
   */
  async getAudioStream(preferredDeviceId = null) {
    const { logger } = this._page;
    
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
        if (preferredDeviceId && err.name === 'OverconstrainedError') {
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
      return devices.filter(device => device.kind === 'audioinput');
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
        logger.info(`Устройство ${index + 1}:`, {
          id: device.deviceId,
          label: device.label,
          groupId: device.groupId,
          kind: device.kind
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
    
    if (!error) {
      return i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
    }
    
    if (error.name) {
      switch (error.name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          return i18n.getTranslation('mic_access_denied') || 'Доступ к микрофону запрещен';
          
        case "NotFoundError":
        case "DevicesNotFoundError":
          return i18n.getTranslation('mic_not_found') || 'Микрофон не найден';
          
        case "NotReadableError":
        case "TrackStartError":
          return i18n.getTranslation('mic_in_use') || 'Микрофон используется другим приложением';
          
        case "OverconstrainedError":
        case "ConstraintNotSatisfiedError":
          return i18n.getTranslation('technical_limitations') || 'Технические ограничения';
          
        case "TypeError":
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
    
    if (!this._recorder || this._recorder.state === "inactive") {
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
    
    if (this._chunks.length === 0) {
      logger.warn("Нет записанных данных");
      return null;
    }
    
    // Проверяем, есть ли в массиве непустые чанки
    const validChunks = this._chunks.filter(chunk => chunk.size > 0);
    
    if (validChunks.length === 0) {
      logger.warn("Все записанные части пусты");
      return null;
    }
    
    const mimeType = this._recorder ? this._recorder.mimeType : 'audio/webm';
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
    
    const possibleTypes = [
      'audio/mp4',
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus'
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
      const trackSettings = audioTrack.getSettings();
      logger.debug(`Параметры аудиопотока (${sourceType}):`, {
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
}

// Экспортируем класс в глобальную область видимости
window.PageObjectMediaService = PageObjectMediaService;

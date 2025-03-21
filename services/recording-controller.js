/**
 * Сервис для управления процессом записи
 */
class PageObjectRecordingControllerService {
  constructor(pageObject) {
    this._page = pageObject;
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Пустой метод для соответствия интерфейсу сервиса
  }

  /**
   * Начать запись аудио
   */
  async startRecording() {
    try {
      this._page.logger.info("Начинаем запись...");
      this._page.ui.showMask();
      
      if (!await this._page.settings.checkApiKey()) {
        this._page.logger.warn('Запись отменена из-за отсутствия API ключа');
        this._page.ui.hideMask();
        return;
      }
      
      let createMediaRecorderAllowed = true;
      
      // Обработчик потери фокуса
      const blurHandler = () => {
        createMediaRecorderAllowed = false;
        this._page.logger.info('Окно потеряло фокус, отмена записи');
      };
      
      // Используем сервис events для обработки blur
      const removeBlurHandler = this._page.events.onWindowBlur(blurHandler);
      
      // Получаем предпочитаемый микрофон из настроек
      const preferredMicrophoneId = this._page.settings.getValue('preferredMicrophoneId');
      
      try {
        this._page.logger.info("Получаем аудиопоток...");
        const stream = await this._page.media.getAudioStream(preferredMicrophoneId);
        
        // Отменяем регистрацию обработчика blur
        removeBlurHandler();
        
        if (!createMediaRecorderAllowed) {
          this._page.logger.info('Разрешение получено, но окно потеряло фокус. Прерываем запись');
          this._page.media.stopAudioTracks();
          this._page.ui.hideMask();
          return;
        }
        
        this._page.logger.info("Создаем MediaRecorder...");
        const recorder = this._page.media.createRecorder(stream);
        
        // Используем сервис media для настройки обработчиков событий
        this._page.media.onDataAvailable((event) => {
          this._page.logger.debug('Получены данные записи:', event.data.size);
        });
        
        this._page.media.onRecordingStop(() => {
          const audioBlob = this._page.media.getRecordedBlob();
          this._page.logger.info(`Запись остановлена. Размер аудио: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
          
          this._page.media.stopAudioTracks();
          this.processRecording(audioBlob);
        });
        
        this._page.logger.info("Запускаем запись...");
        this._page.media.startRecording();
        this._page.ui.changeMaskColor('rgba(0, 255, 0, 0.15)');
      } catch (error) {
        this._page.logger.error("Ошибка при получении аудиопотока:", error);
        this._page.ui.hideMask();
        
        // Отменяем регистрацию обработчика blur
        removeBlurHandler();
      }
    } catch (err) {
      this._page.logger.error("Ошибка при запуске записи:", err);
      this._page.ui.hideMask();
    }
  }
  
  /**
   * Остановить запись аудио
   */
  stopRecording() {
    this._page.logger.info("Останавливаем запись...");
    this._page.ui.hideMask();
    
    if (this._page.media.isInitializing()) {
      this._page.logger.info("Инициализация записи в процессе, ожидаем безопасной остановки...");
      this.scheduleStopRetry();
      return;
    }
    
    if (!this._page.media.isRecording()) {
      this._page.logger.info("Запись не активна, ничего не делаем");
      return;
    }
    
    this._page.media.stopRecording();
  }
  
  /**
   * Планирование повторных попыток остановки записи
   */
  scheduleStopRetry(retryCount = 0, maxRetries = 10) {
    if (!this._page.media.isInitializing() && this._page.media.isRecording()) {
      this._page.media.stopRecording();
    } else if (retryCount < maxRetries) {
      setTimeout(() => this.scheduleStopRetry(retryCount + 1, maxRetries), 100);
    } else {
      this._page.logger.warn("Превышено время ожидания инициализации записи");
      this._page.media.stopAudioTracks();
    }
  }
  
  /**
   * Обработка записанного аудио
   */
  async processRecording(audioBlob) {
    try {
      this._page.logger.info(`Обработка аудио: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
      
      // Отладочное воспроизведение
      if (this._page.settings.getValue('debugAudio') === 'true') {
        this._page.logger.info('Отладка звука включена, воспроизводим запись');
        this._page.ui.showAudioPlayer(audioBlob);
      }
      
      // Проверка наличия звука через сервис анализа аудио
      const containsSound = await this._page.audioAnalyzer.hasSound(audioBlob);
      
      if (!containsSound) {
        this._page.logger.info('Аудио не содержит речи, отменяем запрос к API');
        await this._page.text.insertText(this._page.i18n.getTranslation('speech_not_detected') || 'Речь не обнаружена');
        return;
      }
      
      // Отправка в API через соответствующий сервис
      await this._page.speechApi.sendToElevenLabsAPI(audioBlob);
    } catch (error) {
      this._page.logger.error("Ошибка при обработке аудио:", error);
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectRecordingControllerService = PageObjectRecordingControllerService;

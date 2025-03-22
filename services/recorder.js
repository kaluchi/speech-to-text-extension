/**
 * Сервис для управления процессом записи
 */
class PageObjectRecorderService {
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
      const { logger, ui, settings, media, events } = this._page;
      logger.info("Начинаем запись...");
      
      // Проверяем, нужно ли показывать визуальную маску
      if (settings.getValue('enableRecordingMask')) {
        ui.showMask();
      }
      
      if (!await settings.checkApiKey()) {
        logger.warn('Запись отменена из-за отсутствия API ключа');
        
        // Скрываем маску, если она была показана
        if (settings.getValue('enableRecordingMask')) {
          ui.hideMask();
        }
        return;
      }
      
      let createMediaRecorderAllowed = true;
      
      // Обработчик потери фокуса
      const blurHandler = () => {
        createMediaRecorderAllowed = false;
        logger.info('Окно потеряло фокус, отмена записи');
      };
      
      // Используем сервис events для обработки blur
      const removeBlurHandler = events.onWindowBlur(blurHandler);
      
      // Получаем предпочитаемый микрофон из настроек
      const preferredMicrophoneId = settings.getValue('preferredMicrophoneId');
      
      try {
        logger.info("Получаем аудиопоток...");
        const stream = await media.getAudioStream(preferredMicrophoneId);
        
        // Отменяем регистрацию обработчика blur
        removeBlurHandler();
        
        if (!createMediaRecorderAllowed) {
          logger.info('Разрешение получено, но окно потеряло фокус. Прерываем запись');
          media.stopAudioTracks();
          
          // Скрываем маску, если она была показана
          if (settings.getValue('enableRecordingMask')) {
            ui.hideMask();
          }
          return;
        }
        
        logger.info("Создаем MediaRecorder...");
        const recorder = media.createRecorder(stream);
        
        // Используем сервис media для настройки обработчиков событий
        media.onDataAvailable((event) => {
          logger.debug('Получены данные записи:', event.data.size);
        });
        
        media.onRecordingStop(() => {
          const audioBlob = media.getRecordedBlob();
          logger.info(`Запись остановлена. Размер аудио: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
          
          media.stopAudioTracks();
          this.processRecording(audioBlob);
        });
        
        logger.info("Запускаем запись...");
        media.startRecording();
        ui.changeMaskColor('rgba(0, 255, 0, 0.15)');
      } catch (error) {
        logger.error("Ошибка при получении аудиопотока:", error);
        
        // Скрываем маску, если она была показана
        if (settings.getValue('enableRecordingMask')) {
          ui.hideMask();
        }
        
        // Отменяем регистрацию обработчика blur
        removeBlurHandler();
      }
    } catch (err) {
      const { logger, ui, settings } = this._page;
      logger.error("Ошибка при запуске записи:", err);
      
      // Скрываем маску, если она была показана
      if (settings.getValue('enableRecordingMask')) {
        ui.hideMask();
      }
    }
  }
  
  /**
   * Остановить запись аудио
   */
  stopRecording() {
    const { logger, ui, media, settings } = this._page;
    logger.info("Останавливаем запись...");
    
    // Скрываем маску, только если она показывается
    if (settings.getValue('enableRecordingMask')) {
      ui.hideMask();
    }
    
    if (media.isInitializing()) {
      logger.info("Инициализация записи в процессе, ожидаем безопасной остановки...");
      this.scheduleStopRetry();
      return;
    }
    
    if (!media.isRecording()) {
      logger.info("Запись не активна, ничего не делаем");
      return;
    }
    
    media.stopRecording();
  }
  
  /**
   * Планирование повторных попыток остановки записи
   */
  scheduleStopRetry(retryCount = 0, maxRetries = 10) {
    const { media, logger } = this._page;
    
    if (!media.isInitializing() && media.isRecording()) {
      media.stopRecording();
    } else if (retryCount < maxRetries) {
      setTimeout(() => this.scheduleStopRetry(retryCount + 1, maxRetries), 100);
    } else {
      logger.warn("Превышено время ожидания инициализации записи");
      media.stopAudioTracks();
    }
  }
  
  /**
   * Обработка записанного аудио
   */
  async processRecording(audioBlob) {
    try {
      const { logger, settings, ui, audioAnalyzer, speechApi, text, i18n } = this._page;
      logger.info(`Обработка аудио: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
      
      // Отладочное воспроизведение
      if (settings.getValue('debugAudio')) {
        logger.info('Отладка звука включена, воспроизводим запись');
        ui.showAudioPlayer(audioBlob);
      }
      
      // Проверка наличия звука через сервис анализа аудио
      const containsSound = await audioAnalyzer.hasSound(audioBlob);
      
      if (!containsSound) {
        logger.info('Аудио не содержит речи, отменяем запрос к API');
        await text.insertText(i18n.getTranslation('speech_not_detected') || 'Речь не обнаружена');
        return;
      }
      
      // Показываем индикатор обработки
      ui.changeMaskColor('rgba(255, 165, 0, 0.15)');
      ui.showMask();
      
      try {
        // Отправка в API через соответствующий сервис
        const response = await speechApi.sendToElevenLabsAPI(audioBlob);
        
        // Вставляем результат в активный элемент
        await text.insertText(response.result);
        
        // Проверяем на ошибку авторизации и открываем настройки если нужно
        if (!response.ok && response.result.includes('401')) {
          // Проверка наличия API ключа
          const apiKey = settings.getValue('apiKey');
          if (!apiKey) {
            // Открыть страницу настроек при проблемах с API ключом
            this._page.chrome.openOptionsPage();
          }
        }
      } finally {
        // Скрываем маску после завершения обработки
        ui.hideMask();
      }
    } catch (error) {
      const { logger, ui } = this._page;
      logger.error("Ошибка при обработке аудио:", error);
      ui.hideMask(); // Дополнительная проверка, чтобы маска точно была скрыта
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectRecorderService = PageObjectRecorderService;

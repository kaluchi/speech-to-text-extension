/**
 * Сервис для управления процессом записи речи
 * 
 * Этот сервис контролирует полный цикл записи аудио:
 * - Инициализация записи с проверкой настроек и разрешений
 * - Управление процессом записи (запуск и остановка)
 * - Обработка записанного аудио, включая анализ и отправку в API
 * - Обработка ошибок и восстановление после них
 * 
 * Сервис взаимодействует с другими сервисами через PageObject:
 * - media: для работы с микрофоном и аудиозаписью
 * - ui: для отображения визуальной обратной связи
 * - settings: для проверки настроек
 * - speechApi: для отправки аудио на распознавание
 * - text: для вставки результатов в активный элемент
 */
class PageObjectRecorderService {
  /**
   * Создает экземпляр сервиса записи
   * @param {PageObject} pageObject - Центральный объект PageObject
   */
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
   * 
   * Выполняет следующие шаги:
   * 1. Проверяет настройки и наличие API ключа
   * 2. Настраивает обработчики событий для безопасной работы
   * 3. Получает доступ к микрофону
   * 4. Инициализирует и запускает MediaRecorder
   * 5. Настраивает обработчики событий для обработки данных
   * 
   * При любой ошибке гарантирует корректную очистку ресурсов
   */
  async startRecording() {
    const { logger, ui, settings, media, events } = this._page;
    
    try {
      logger.info("Начинаем запись...");
      
      // Проверяем, нужно ли показывать визуальную маску
      if (settings.getValue('enableRecordingMask')) {
        ui.showMask();
      }
      
      // Проверка наличия API ключа
      if (!await settings.checkApiKey()) {
        logger.warn('Запись отменена из-за отсутствия API ключа');
        
        // Скрываем маску, если она была показана
        settings.getValue('enableRecordingMask') && ui.hideMask();
        return;
      }
      
      // Флаг для контроля разрешения создания MediaRecorder
      // (если окно потеряет фокус во время запроса разрешения, запись не будет начата)
      let createMediaRecorderAllowed = true;
      
      // Обработчик потери фокуса окном
      const blurHandler = () => {
        createMediaRecorderAllowed = false;
        logger.info('Окно потеряло фокус, отмена записи');
      };
      
      // Устанавливаем обработчик потери фокуса
      const removeBlurHandler = events.onWindowBlur(blurHandler);
      
      // Получаем предпочитаемый микрофон из настроек
      const preferredMicrophoneId = settings.getValue('preferredMicrophoneId');
      
      try {
        // Запрашиваем доступ к микрофону
        logger.info("Получаем аудиопоток...");
        const stream = await media.getAudioStream(preferredMicrophoneId);
        
        // Отменяем регистрацию обработчика потери фокуса
        removeBlurHandler?.();
        
        // Проверяем, не потеряло ли окно фокус во время запроса микрофона
        if (!createMediaRecorderAllowed) {
          logger.info('Разрешение получено, но окно потеряло фокус. Прерываем запись');
          media.stopAudioTracks();
          
          // Скрываем маску, если она была показана
          settings.getValue('enableRecordingMask') && ui.hideMask();
          return;
        }
        
        // Инициализируем MediaRecorder
        logger.info("Создаем MediaRecorder...");
        const recorder = media.createRecorder(stream);
        
        // Настраиваем обработчик получения данных от MediaRecorder
        media.onDataAvailable((event) => {
          logger.debug('Получены данные записи:', event.data?.size);
        });
        
        // Настраиваем обработчик ошибок записи
        media.onRecordingError((error) => {
          logger.error('Ошибка записи:', error);
          media.stopAudioTracks();
          settings.getValue('enableRecordingMask') && ui.hideMask();
        });
        
        // Настраиваем обработчик остановки записи
        media.onRecordingStop(() => {
          const audioBlob = media.getRecordedBlob();
          media.stopAudioTracks();
            
          // Проверяем, получены ли данные
          if (!audioBlob) {
            logger.info("Не удалось получить аудио для обработки");
          } else {
            logger.info(`Запись остановлена. Размер аудио: ${audioBlob.size} байт, Формат: ${audioBlob.type}`);
            // Запускаем обработку полученного аудио
            this.processRecording(audioBlob);
          }
        });
        
        // Запускаем запись
        logger.info("Запускаем запись...");
        media.startRecording();
        ui.changeMaskColor('rgba(0, 255, 0, 0.15)'); // Зеленый цвет для обратной связи
      } catch (error) {
        // Обработка ошибок при получении аудиопотока
        logger.error("Ошибка при получении аудиопотока:", error);
        
        // Скрываем маску, если она была показана
        settings.getValue('enableRecordingMask') && ui.hideMask();
        
        // Отменяем регистрацию обработчика потери фокуса
        removeBlurHandler?.();
      }
    } catch (err) {
      // Обработка непредвиденных ошибок
      logger.error("Ошибка при запуске записи:", err);
      
      // Скрываем маску, если она была показана
      settings.getValue('enableRecordingMask') && ui.hideMask();
    }
  }
  
  /**
   * Остановить запись аудио
   * 
   * Корректно останавливает запись в зависимости от текущего состояния.
   * Обрабатывает различные сценарии, включая:
   * - Запись активна: останавливаем запись
   * - Запись в процессе инициализации: планируем повторные попытки остановки
   * - Запись не активна: ничего не делаем
   */
  stopRecording() {
    const { logger, ui, media, settings } = this._page;
    
    logger.info("Останавливаем запись...");
    
    // Скрываем маску, только если она показывается
    settings.getValue('enableRecordingMask') && ui.hideMask();
    
    // Проверка состояния записи: инициализация
    if (media.isInitializing()) {
      logger.info("Инициализация записи в процессе, ожидаем безопасной остановки...");
      this.scheduleStopRetry();
      return;
    }
    
    // Проверка состояния записи: не активна
    if (!media.isRecording()) {
      logger.info("Запись не активна, ничего не делаем");
      return;
    }
    
    // Запись активна, останавливаем
    media.stopRecording();
  }
  
  /**
   * Планирование повторных попыток остановки записи
   * 
   * Используется, когда запись находится в процессе инициализации,
   * но пользователь уже запросил ее остановку. Метод пытается остановить
   * запись, когда она станет доступной, с ограничением на количество попыток.
   * 
   * @param {number} retryCount - Текущий номер попытки (начинается с 0)
   * @param {number} maxRetries - Максимальное количество попыток
   */
  scheduleStopRetry(retryCount = 0, maxRetries = 30) {
    const { media, logger } = this._page;
    
    // Если запись инициализирована и активна, останавливаем ее
    if (!media.isInitializing() && media.isRecording()) {
      media.stopRecording();
    } 
    // Если не превышено максимальное количество попыток, планируем следующую попытку
    else if (retryCount < maxRetries) {
      setTimeout(() => this.scheduleStopRetry(retryCount + 1, maxRetries), 100);
    } 
    // Если превышено максимальное количество попыток, принудительно освобождаем ресурсы
    else {
      logger.warn("Превышено время ожидания инициализации записи");
      media.stopAudioTracks();
    }
  }
  
  /**
   * Обработка записанного аудио
   * 
   * Выполняет следующие шаги:
   * 1. Проверяет аудиофайл на наличие данных
   * 2. При необходимости отображает отладочное воспроизведение
   * 3. Анализирует аудио на наличие речи
   * 4. Отправляет аудио в API распознавания
   * 5. Вставляет распознанный текст
   * 
   * @param {Blob} audioBlob - Записанные аудиоданные
   */
  async processRecording(audioBlob) {
    const { logger, settings, ui, audioAnalyzer, speechApi, text, i18n } = this._page;
    
    try {
      logger.info(`Обработка аудио: ${audioBlob?.size} байт, Формат: ${audioBlob?.type}`);
      
      // Проверка на пустой аудиофайл
      if (audioBlob?.size === 0) {
        logger.warn('Получен пустой аудиофайл');
        await text.insertText(i18n.getTranslation('empty_audio_file') || 'Запись не удалась, попробуйте снова');
        return;
      }
      
      // Отладочное воспроизведение (если включено в настройках)
      if (settings.getValue('debugAudio')) {
        logger.info('Отладка звука включена, воспроизводим запись');
        ui.showAudioPlayer(audioBlob);
      }
      
      // Анализ аудио на наличие речи
      const containsSound = await audioAnalyzer.hasSound(audioBlob);
      
      // Если речь не обнаружена, прекращаем обработку
      if (!containsSound) {
        logger.info('Аудио не содержит речи, отменяем запрос к API');
        await text.insertText(i18n.getTranslation('speech_not_detected') || 'Речь не обнаружена');
        return;
      }
      
      // Отправка аудио в API распознавания речи
      const response = await speechApi.sendToElevenLabsAPI(audioBlob);
      
      // Вставка распознанного текста в активный элемент
      await text.insertText(response?.result);
    
    } catch (error) {
      // Обработка ошибок при обработке аудио
      logger.error("Ошибка при обработке аудио:", error);
    } finally {
      // В любом случае скрываем маску после завершения обработки
      ui.hideMask();
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectRecorderService = PageObjectRecorderService;
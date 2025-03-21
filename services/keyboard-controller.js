/**
 * Сервис для обработки клавиатурных событий и двойных нажатий
 */
class PageObjectKeyboardControllerService {
  constructor(pageObject) {
    this._page = pageObject;
    
    // Состояния клавиш
    this._states = {
      IDLE: "idle",      // Не нажато
      PRESSED: "pressed", // Клавиша нажата
      RELEASED: "released", // Клавиша отпущена после нажатия
      HELD: "held",      // Клавиша удерживается (после двойного нажатия)
    };
    
    // Определяем целевую клавишу в зависимости от платформы
    this._isMac = navigator.platform.toLowerCase().includes("mac");
    this._targetKey = this._isMac ? "Meta" : "Control";
    
    // Параметры
    this._doublePressThreshold = 300; // Порог для двойного нажатия (мс)
    
    // Переменные состояния
    this._state = this._states.IDLE;
    this._lastTime = 0;
    this._lastKeyUpTime = 0;
    this._currentKey = null;
    
    // Привязываем методы к текущему экземпляру
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleNonTargetKey = this.handleNonTargetKey.bind(this);
    this.resetToIdle = this.resetToIdle.bind(this);
  }
  
  /**
   * Инициализация сервиса
   */
  init() {
    this._page.logger.info(`Настройка обработчиков клавиши ${this._targetKey} для управления записью`);
    
    // Используем сервис events для установки обработчиков
    this._page.events.onKeyDown(this._targetKey, this.handleKeyDown);
    this._page.events.onKeyUp(this._targetKey, this.handleKeyUp);
    
    // Регистрация обработчика сообщений для проверки микрофона
    this._page.chrome.onMessage('checkMicrophoneStatus', async () => {
      this._page.logger.info("Получен запрос на проверку статуса микрофона");
      return await this._page.media.checkMicrophonePermission();
    });
  }
  
  /**
   * Сброс состояния в исходное
   */
  resetToIdle() {
    this._state = this._states.IDLE;
    this._currentKey = null;
    this._lastTime = 0;
    this._lastKeyUpTime = 0;
  }
  
  /**
   * Обработка нажатия не целевой клавиши
   */
  handleNonTargetKey(event) {
    if (event.key !== this._targetKey && this._state !== this._states.IDLE) {
      this._page.logger.debug(`${event.type === 'keydown' ? 'Нажата' : 'Отпущена'} не целевая клавиша: ${event.key}, Сброс в Idle`);
      
      if (this._state === this._states.HELD) {
        this.stopRecording();
      }
      
      this.resetToIdle();
      return true;
    }
    return false;
  }
  
  /**
   * Обработка нажатия клавиши
   */
  handleKeyDown(event, currentTime) {
    this._page.logger.debug(`Событие keydown: ${event.key}, текущее состояние: ${this._state}`);
    
    if (this.handleNonTargetKey(event)) {
      return;
    }
    
    switch (this._state) {
      case this._states.IDLE:
        this._state = this._states.PRESSED;
        this._currentKey = event.key;
        this._lastTime = currentTime;
        this._page.logger.debug(`Нажатие: ${event.key} (Pressed)`);
        break;
        
      case this._states.RELEASED:
        if (currentTime - this._lastKeyUpTime <= this._doublePressThreshold) {
          this._state = this._states.HELD;
          this._lastTime = currentTime;
          this._page.logger.info(`Нажатие: ${event.key} (Удержание - Обнаружено двойное нажатие)`);
          this.startRecording();
        } else {
          this._state = this._states.PRESSED;
          this._lastTime = currentTime;
          this._page.logger.debug(`Нажатие: ${event.key} (Pressed - Слишком медленно)`);
        }
        break;
        
      // В состояниях PRESSED или HELD просто игнорируем события
    }
  }
  
  /**
   * Обработка отпускания клавиши
   */
  handleKeyUp(event, keyUpTime) {
    this._page.logger.debug(`Событие keyup: ${event.key}, текущее состояние: ${this._state}`);
    
    if (this.handleNonTargetKey(event)) {
      return;
    }
    
    if (event.key === this._currentKey) {
      switch (this._state) {
        case this._states.PRESSED:
          this._state = this._states.RELEASED;
          this._lastKeyUpTime = keyUpTime;
          const duration = (keyUpTime - this._lastTime).toFixed(2);
          this._page.logger.debug(`Отпускание: ${event.key}, Время удержания: ${duration}мс (Released)`);
          break;
          
        case this._states.HELD:
          this._state = this._states.IDLE;
          const heldDuration = (keyUpTime - this._lastTime).toFixed(2);
          this._page.logger.info(`Отпускание: ${event.key}, Время удержания в Held: ${heldDuration}мс`);
          this.stopRecording();
          this.resetToIdle();
          break;
      }
    }
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
window.PageObjectKeyboardControllerService = PageObjectKeyboardControllerService;

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
  async init() {
    this._page.logger.info(`Настройка обработчиков клавиши ${this._targetKey} для управления записью`);
    
    // Используем сервис events для установки обработчиков
    this._page.events.onKeyDown(this._targetKey, this.handleKeyDown);
    this._page.events.onKeyUp(this._targetKey, this.handleKeyUp);
    
    // Регистрация обработчика сообщений для проверки микрофона
    this._page.chrome.onMessage('checkMicrophoneStatus', async () => {
      this._page.logger.info("Получен запрос на проверку статуса микрофона");
      return await this._page.media.checkMicrophonePermission();
    });
    
    // Ожидаем инициализации контроллера записи
    await this._page._initializeService('recordingController');
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
        this._page.recordingController.stopRecording();
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
          this._page.recordingController.startRecording();
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
          this._page.recordingController.stopRecording();
          this.resetToIdle();
          break;
      }
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectKeyboardControllerService = PageObjectKeyboardControllerService;

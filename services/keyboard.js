/**
 * Сервис для обработки клавиатурных событий и управления двойными нажатиями
 */
class PageObjectKeyboardService {
  // Константы состояний клавиатуры
  static STATE = {
    IDLE: 'idle',
    AWAITING_SECOND_PRESS: 'awaitingSecondPress', 
    RECORDING: 'recording'
  };
  
  // Константы клавиш
  
  // Константы клавиш
  static KEY = {
    META: 'Meta',
    CONTROL: 'Control'
  };
  
  constructor(pageObject) {
    this._page = pageObject;
    
    // Определяем платформозависимую целевую клавишу (Ctrl для Windows/Linux, Cmd для Mac)
    this._isMac = navigator.platform.toLowerCase().includes("mac");
    this._targetKey = this._isMac ? PageObjectKeyboardService.KEY.META : PageObjectKeyboardService.KEY.CONTROL;
    
    // Настройки
    this._doublePressThreshold = 300; // Максимальное время между нажатиями для двойного клика (мс)
    
    // Состояние записи
    this._state = PageObjectKeyboardService.STATE.IDLE;
    this._lastPressTime = 0;
    this._lastReleaseTime = 0;
    this._timeoutId = null;
    
    // Привязываем методы к контексту
    this._bindMethods();
  }
  
  /**
   * Привязка методов к контексту
   * @private
   */
  _bindMethods() {
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._isTargetKey = this._isTargetKey.bind(this);
  }
  
  /**
   * Инициализация сервиса
   */
  async init() {
    const { logger, dom } = this._page;
    
    logger.info(`Настройка обработчиков клавиши ${this._targetKey} для управления записью`);
    
    // Подписка на клавиатурные события
    dom.addDocumentEventListener('keydown', this._handleKeyDown);
    dom.addDocumentEventListener('keyup', this._handleKeyUp);
    
    // Ожидаем инициализации контроллера записи
    await this._page._initializeService('recorder');
  }
  
  /**
   * Обработка нажатия клавиши
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @private
   */
  _handleKeyDown(event) {
    const { logger } = this._page;
    const currentTime = performance.now();
    const { STATE } = PageObjectKeyboardService;
    
    // Проверяем, целевая ли это клавиша
    const isTarget = this._isTargetKey(event);
    
    // Если не целевая клавиша
    if (!isTarget) {
      // Если мы в процессе записи, останавливаем запись
      if (this._state === STATE.RECORDING) {
        this._stopRecording();
      }
      return;
    }
    
    logger.debug(`Нажата целевая клавиша: ${event.key}, состояние: ${this._state}`);
    
    // Обрабатываем в зависимости от текущего состояния
    switch (this._state) {
      case STATE.IDLE:
        this._lastPressTime = currentTime;
        this._state = STATE.AWAITING_SECOND_PRESS;
        break;
        
      case STATE.AWAITING_SECOND_PRESS:
        if (currentTime - this._lastReleaseTime <= this._doublePressThreshold) {
          this._startRecording();
        } else {
          // Не успели во время второго нажатия, считаем это новым первым нажатием
          this._lastPressTime = currentTime;
        }
        break;
    }
  }
  
  /**
   * Обработка отпускания клавиши
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @private
   */
  _handleKeyUp(event) {
    // Если отпущена не целевая клавиша, игнорируем
    if (!this._isTargetKey(event)) return;
    
    const { logger } = this._page;
    const currentTime = performance.now();
    const { STATE } = PageObjectKeyboardService;
    
    logger.debug(`Отпущена целевая клавиша: ${event.key}, состояние: ${this._state}`);
    
    // Обрабатываем в зависимости от текущего состояния
    switch (this._state) {
      case STATE.AWAITING_SECOND_PRESS:
        this._lastReleaseTime = currentTime;
        
        // Устанавливаем таймаут для ожидания второго нажатия
        this._clearTimeout();
        this._timeoutId = setTimeout(() => {
          if (this._state === STATE.AWAITING_SECOND_PRESS) {
            logger.debug('Таймаут ожидания второго нажатия, возврат в idle');
            this._state = STATE.IDLE;
          }
        }, this._doublePressThreshold);
        break;
        
      case STATE.RECORDING:
        this._stopRecording();
        break;
    }
  }
  
  /**
   * Начинает запись
   * @private
   */
  _startRecording() {
    const { logger, recorder } = this._page;
    logger.info("Обнаружено двойное нажатие целевой клавиши, начинаем запись");
    this._state = PageObjectKeyboardService.STATE.RECORDING;
    recorder.startRecording();
  }
  
  /**
   * Останавливает запись
   * @private
   */
  _stopRecording() {
    const { logger, recorder } = this._page;
    logger.info("Останавливаем запись");
    this._state = PageObjectKeyboardService.STATE.IDLE;
    recorder.stopRecording();
  }
  
  /**
   * Очищает таймаут ожидания второго нажатия
   * @private
   */
  _clearTimeout() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }
  
  /**
   * Проверяет, является ли клавиша в событии целевой (Ctrl/Cmd)
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @returns {boolean} - true, если клавиша является целевой
   * @private
   */
  _isTargetKey(event) {
    return event.key === this._targetKey;
  }
  
  /**
   * Возвращает текущее состояние
   * @returns {string} - Текущее состояние
   */
  getCurrentState() {
    return this._state;
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectKeyboardService = PageObjectKeyboardService;
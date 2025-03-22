/**
 * Сервис для обработки клавиатурных событий и управления двойными нажатиями
 * с использованием паттерна конечного автомата
 */
class PageObjectKeyboardService {
  constructor(pageObject) {
    this._page = pageObject;
    
    // Определяем платформозависимую целевую клавишу (Ctrl для Windows/Linux, Cmd для Mac)
    this._isMac = navigator.platform.toLowerCase().includes("mac");
    this._targetKey = this._isMac ? "Meta" : "Control";
    
    // Настройки
    this._doublePressThreshold = 300; // Максимальное время между нажатиями для двойного клика (мс)
    
    // Инициализация переменных состояния
    this._lastPressTime = 0;
    this._lastReleaseTime = 0;
    this._timeoutId = null;
    
    // Определение конечного автомата
    this._initStateMachine();
    
    // Привязываем методы к контексту
    this._bindMethods();
  }
  
  /**
   * Инициализация конечного автомата
   * @private
   */
  _initStateMachine() {
    this._fsm = {
      currentState: 'idle',
      transitions: {
        // Состояние покоя
        idle: {
          keydown: (event, time) => this._isTargetKey(event) ? this._handleFirstPress(time) : 'idle'
        },
        
        // Состояние после первого нажатия
        firstPress: {
          keyup: (event, time) => this._isTargetKey(event) ? this._handleFirstRelease(time) : 'idle',
          otherKey: () => 'idle'
        },
        
        // Ожидание второго нажатия
        awaitingSecondPress: {
          keydown: (event, time) => {
            if (!this._isTargetKey(event)) return 'idle';
            return this._isDoublePressValid(time) ? this._startRecording() : this._handleFirstPress(time);
          },
          timeout: () => 'idle'
        },
        
        // Запись идет
        recording: {
          keyup: (event) => this._isTargetKey(event) ? this._stopRecording() : 'recording',
          otherKey: () => this._stopRecording()
        }
      }
    };
  }
  
  /**
   * Привязка методов к контексту
   * @private
   */
  _bindMethods() {
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleKeyUp = this._handleKeyUp.bind(this);
    this._handleNonTargetKey = this._handleNonTargetKey.bind(this);
    this._isTargetKey = this._isTargetKey.bind(this);
    this._transition = this._transition.bind(this);
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
   * Проверяет, является ли клавиша в событии целевой (Ctrl/Cmd)
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @returns {boolean} - true, если клавиша является целевой
   * @private
   */
  _isTargetKey(event) {
    return event.key === this._targetKey;
  }
  
  /**
   * Обработка первого нажатия клавиши
   * @param {number} time - Время нажатия
   * @returns {string} - Новое состояние
   * @private
   */
  _handleFirstPress(time) {
    this._lastPressTime = time;
    return 'firstPress';
  }
  
  /**
   * Обработка отпускания клавиши после первого нажатия
   * @param {number} time - Время отпускания
   * @returns {string} - Новое состояние
   * @private
   */
  _handleFirstRelease(time) {
    this._lastReleaseTime = time;
    return 'awaitingSecondPress';
  }
  
  /**
   * Проверяет, попадает ли второе нажатие в пределы времени для двойного клика
   * @param {number} currentTime - Текущее время
   * @returns {boolean} - true, если второе нажатие считается частью двойного нажатия
   * @private
   */
  _isDoublePressValid(currentTime) {
    return currentTime - this._lastReleaseTime <= this._doublePressThreshold;
  }
  
  /**
   * Начинает запись и возвращает новое состояние
   * @returns {string} - Новое состояние
   * @private
   */
  _startRecording() {
    this._page.logger.info("Обнаружено двойное нажатие целевой клавиши, начинаем запись");
    this._page.recorder.startRecording();
    return 'recording';
  }
  
  /**
   * Останавливает запись и возвращает новое состояние
   * @returns {string} - Новое состояние
   * @private
   */
  _stopRecording() {
    this._page.logger.info("Целевая клавиша отпущена, останавливаем запись");
    this._page.recorder.stopRecording();
    return 'idle';
  }
  
  /**
   * Обработка нажатия не целевой клавиши
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @returns {boolean} - true, если событие обработано
   * @private
   */
  _handleNonTargetKey(event) {
    const relevantStates = ['firstPress', 'recording'];
    
    if (!this._isTargetKey(event) && relevantStates.includes(this._fsm.currentState)) {
      this._page.logger.debug(`${event.type === 'keydown' ? 'Нажата' : 'Отпущена'} не целевая клавиша: ${event.key}`);
      this._transition('otherKey', event);
      return true;
    }
    
    return false;
  }
  
  /**
   * Обработка нажатия клавиши
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @private
   */
  _handleKeyDown(event) {
    const { logger } = this._page;
    const currentTime = performance.now();
    
    logger.debug(`Событие keydown: ${event.key}, состояние: ${this._fsm.currentState}`);
    
    // Обрабатываем нажатие не целевой клавиши
    if (this._handleNonTargetKey(event)) return;
    
    // Обрабатываем нажатие целевой клавиши
    if (this._isTargetKey(event)) {
      this._transition('keydown', event, currentTime);
    }
  }
  
  /**
   * Обработка отпускания клавиши
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @private
   */
  _handleKeyUp(event) {
    const { logger } = this._page;
    const currentTime = performance.now();
    
    logger.debug(`Событие keyup: ${event.key}, состояние: ${this._fsm.currentState}`);
    
    // Пропускаем обработку отпускания не целевой клавиши
    if (!this._isTargetKey(event)) return;
    
    // Обрабатываем отпускание целевой клавиши
    this._transition('keyup', event, currentTime);
    
    // Устанавливаем таймаут при необходимости
    this._setupTimeoutIfNeeded();
  }
  
  /**
   * Устанавливает таймаут для состояния ожидания второго нажатия
   * @private
   */
  _setupTimeoutIfNeeded() {
    if (this._fsm.currentState !== 'awaitingSecondPress') return;
    
    this._clearTimeout();
    this._timeoutId = setTimeout(() => {
      if (this._fsm.currentState === 'awaitingSecondPress') {
        this._transition('timeout');
      }
    }, this._doublePressThreshold);
  }
  
  /**
   * Выполняет переход между состояниями конечного автомата
   * @param {string} action - Действие, вызывающее переход
   * @param {KeyboardEvent} event - Событие клавиатуры
   * @param {number} time - Время события
   * @private
   */
  _transition(action, event = null, time = performance.now()) {
    const { logger } = this._page;
    const currentState = this._fsm.currentState;
    const transitions = this._fsm.transitions[currentState];
    
    if (!transitions || !transitions[action]) return;
    
    const newState = transitions[action](event, time);
    
    if (newState !== currentState) {
      logger.debug(`Переход: ${currentState} → ${newState} (${action})`);
      this._fsm.currentState = newState;
      
      // Очищаем таймаут при выходе из состояния ожидания
      if (currentState === 'awaitingSecondPress') {
        this._clearTimeout();
      }
    }
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
   * Возвращает текущее состояние конечного автомата
   * @returns {string} - Текущее состояние
   */
  getCurrentState() {
    return this._fsm.currentState;
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectKeyboardService = PageObjectKeyboardService;
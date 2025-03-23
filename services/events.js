/**
 * Сервис для работы с событиями DOM
 */
class PageObjectEventsService {
  constructor(pageObject) {
    this._page = pageObject;
    this._documentListeners = new Map();
    this._windowListeners = new Map();
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Ничего не делаем при инициализации
  }

  /**
   * Очистка всех обработчиков событий
   * Вызывается при уничтожении сервиса
   */
  dispose() {
    const { dom } = this._page;
    
    // Очистка обработчиков document
    this._documentListeners.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        dom.removeDocumentEventListener(eventType, handler);
      });
    });
    this._documentListeners.clear();
    
    // Очистка обработчиков window
    this._windowListeners.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        dom.removeWindowEventListener(eventType, handler);
      });
    });
    this._windowListeners.clear();
  }

  /**
   * Добавляет обработчик события к document
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события (capture, once, passive)
   * @returns {Function} - Функция для удаления обработчика
   */
  addDocumentListener(eventType, handler, options = {}) {
    const { dom } = this._page;
    dom.addDocumentEventListener(eventType, handler, options);
    
    // Сохраняем обработчик для возможности его удаления
    if (!this._documentListeners.has(eventType)) {
      this._documentListeners.set(eventType, new Set());
    }
    this._documentListeners.get(eventType).add(handler);
    
    return () => this.removeDocumentListener(eventType, handler);
  }

  /**
   * Удаляет обработчик события с document
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   */
  removeDocumentListener(eventType, handler) {
    const { dom } = this._page;
    dom.removeDocumentEventListener(eventType, handler);
    
    if (this._documentListeners.has(eventType)) {
      this._documentListeners.get(eventType).delete(handler);
    }
  }

  /**
   * Добавляет обработчик события к window
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события (capture, once, passive)
   * @returns {Function} - Функция для удаления обработчика
   */
  addWindowListener(eventType, handler, options = {}) {
    const { dom } = this._page;
    dom.addWindowEventListener(eventType, handler, options);
    
    // Сохраняем обработчик для возможности его удаления
    if (!this._windowListeners.has(eventType)) {
      this._windowListeners.set(eventType, new Set());
    }
    this._windowListeners.get(eventType).add(handler);
    
    return () => this.removeWindowListener(eventType, handler);
  }

  /**
   * Удаляет обработчик события с window
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   */
  removeWindowListener(eventType, handler) {
    const { dom } = this._page;
    dom.removeWindowEventListener(eventType, handler);
    
    if (this._windowListeners.has(eventType)) {
      this._windowListeners.get(eventType).delete(handler);
    }
  }

  /**
   * Обработчик нажатия клавиши
   * @param {string} targetKey - Целевая клавиша
   * @param {Function} handler - Обработчик
   * @returns {Function} - Функция для удаления обработчика
   */
  onKeyDown(targetKey, handler) {
    const keyDownHandler = (event) => {
      if (event.key === targetKey) {
        handler(event, performance.now());
      }
    };
    
    return this.addDocumentListener('keydown', keyDownHandler);
  }

  /**
   * Обработчик отпускания клавиши
   * @param {string} targetKey - Целевая клавиша
   * @param {Function} handler - Обработчик
   * @returns {Function} - Функция для удаления обработчика
   */
  onKeyUp(targetKey, handler) {
    const keyUpHandler = (event) => {
      if (event.key === targetKey) {
        handler(event, performance.now());
      }
    };
    
    return this.addDocumentListener('keyup', keyUpHandler);
  }

  /**
   * Обработчик потери фокуса окном
   * @param {Function} handler - Обработчик
   * @returns {Function} - Функция для удаления обработчика
   */
  onWindowBlur(handler) {
    return this.addWindowListener('blur', handler);
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectEventsService = PageObjectEventsService;
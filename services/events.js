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
    window.addEventListener(eventType, handler, options);
    
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
    window.removeEventListener(eventType, handler);
    
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

  /**
   * Обработчик получения фокуса окном
   * @param {Function} handler - Обработчик
   * @returns {Function} - Функция для удаления обработчика
   */
  onWindowFocus(handler) {
    return this.addWindowListener('focus', handler);
  }

  /**
   * Создает и отправляет пользовательское событие
   * @param {string} eventName - Имя события
   * @param {Object} detail - Данные события
   * @param {boolean} bubbles - Флаг всплытия
   * @param {boolean} cancelable - Флаг отменяемости
   * @returns {CustomEvent} - Созданное событие
   */
  dispatchCustomEvent(eventName, detail = {}, bubbles = true, cancelable = true) {
    const { dom } = this._page;
    return dom.dispatchCustomEvent(eventName, detail, bubbles, cancelable);
  }

  /**
   * Очищает все обработчики событий
   */
  clearAllListeners() {
    const { dom } = this._page;
    
    // Очистка document listeners
    this._documentListeners.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        dom.removeDocumentEventListener(eventType, handler);
      });
    });
    this._documentListeners.clear();
    
    // Очистка window listeners
    this._windowListeners.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        window.removeEventListener(eventType, handler);
      });
    });
    this._windowListeners.clear();
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectEventsService = PageObjectEventsService;

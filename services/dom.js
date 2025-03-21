/**
 * Сервис для работы с DOM элементами
 * Инкапсулирует все взаимодействия с document
 */
class PageObjectDomService {
  constructor(pageObject) {
    this._page = pageObject;
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Ничего не делаем при инициализации
  }

  /**
   * Получает текущий активный элемент
   * @returns {HTMLElement} - Текущий активный элемент
   */
  getActiveElement() {
    return document.activeElement;
  }

  /**
   * Получает элемент body
   * @returns {HTMLElement} - Элемент body
   */
  getBody() {
    return document.body;
  }

  /**
   * Создает HTML элемент с заданными атрибутами и стилями
   * @param {string} tagName - Имя тега элемента
   * @param {Object} attributes - Атрибуты элемента
   * @param {Object} styles - Стили элемента
   * @param {string} textContent - Текстовое содержимое элемента
   * @returns {HTMLElement} - Созданный элемент
   */
  createElement(tagName, attributes = {}, styles = {}, textContent = '') {
    const element = document.createElement(tagName);
    
    // Устанавливаем атрибуты
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(key, value);
      }
    });
    
    // Устанавливаем стили
    Object.entries(styles).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        element.style[key] = value;
      }
    });
    
    // Устанавливаем текстовое содержимое
    if (textContent) {
      element.textContent = textContent;
    }
    
    return element;
  }

  /**
   * Создает текстовый узел
   * @param {string} text - Текст для узла
   * @returns {Text} - Созданный текстовый узел
   */
  createTextNode(text) {
    return document.createTextNode(text);
  }

  /**
   * Добавляет элемент в родительский элемент
   * @param {HTMLElement} parent - Родительский элемент
   * @param {HTMLElement} child - Дочерний элемент
   * @returns {HTMLElement} - Добавленный элемент
   */
  appendChild(parent, child) {
    return parent.appendChild(child);
  }

  /**
   * Добавляет элемент в body
   * @param {HTMLElement} child - Дочерний элемент
   * @returns {HTMLElement} - Добавленный элемент
   */
  appendToBody(child) {
    return document.body.appendChild(child);
  }

  /**
   * Удаляет элемент из DOM
   * @param {HTMLElement} element - Элемент для удаления
   */
  removeElement(element) {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  /**
   * Проверяет, является ли элемент редактируемым полем ввода
   * @param {HTMLElement} element - Проверяемый элемент
   * @returns {boolean} - true, если элемент является редактируемым полем
   */
  isEditableElement(element) {
    if (!element) return false;
    
    // Проверяем input и textarea
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return !element.disabled && !element.readOnly;
    }
    
    // Проверяем contenteditable
    return element.isContentEditable;
  }

  /**
   * Получает текущее выделение в документе
   * @returns {Selection} - Текущее выделение
   */
  getSelection() {
    return window.getSelection();
  }

  /**
   * Добавляет обработчик события к document
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события (capture, once, passive)
   */
  addDocumentEventListener(eventType, handler, options = {}) {
    document.addEventListener(eventType, handler, options);
  }

  /**
   * Удаляет обработчик события с document
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события
   */
  removeDocumentEventListener(eventType, handler, options = {}) {
    document.removeEventListener(eventType, handler, options);
  }

  /**
   * Добавляет обработчик события к элементу
   * @param {HTMLElement} element - DOM элемент
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события
   */
  addEventListener(element, eventType, handler, options = {}) {
    element.addEventListener(eventType, handler, options);
  }

  /**
   * Удаляет обработчик события с элемента
   * @param {HTMLElement} element - DOM элемент
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события
   */
  removeEventListener(element, eventType, handler, options = {}) {
    element.removeEventListener(eventType, handler, options);
  }

  /**
   * Создает и отправляет пользовательское событие в document
   * @param {string} eventName - Имя события
   * @param {Object} detail - Данные события
   * @param {boolean} bubbles - Флаг всплытия
   * @param {boolean} cancelable - Флаг отменяемости
   * @returns {CustomEvent} - Созданное событие
   */
  dispatchCustomEvent(eventName, detail = {}, bubbles = true, cancelable = true) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles,
      cancelable
    });
    
    document.dispatchEvent(event);
    return event;
  }

  /**
   * Генерирует DOM событие и отправляет его на элемент
   * @param {HTMLElement} element - Элемент для отправки события
   * @param {string} eventName - Имя события
   * @param {boolean} bubbles - Флаг всплытия
   * @param {boolean} cancelable - Флаг отменяемости
   * @returns {Event} - Созданное событие
   */
  dispatchEvent(element, eventName, bubbles = true, cancelable = true) {
    const event = new Event(eventName, { bubbles, cancelable });
    element.dispatchEvent(event);
    return event;
  }

  /**
   * Проверяет, содержится ли элемент в документе
   * @param {HTMLElement} element - Проверяемый элемент
   * @returns {boolean} - true, если элемент в документе
   */
  isElementInDocument(element) {
    return document.contains(element);
  }

  /**
   * Находит элемент по селектору
   * @param {string} selector - CSS селектор
   * @returns {HTMLElement} - Найденный элемент или null
   */
  querySelector(selector) {
    return document.querySelector(selector);
  }

  /**
   * Находит все элементы по селектору
   * @param {string} selector - CSS селектор
   * @returns {NodeList} - Список найденных элементов
   */
  querySelectorAll(selector) {
    return document.querySelectorAll(selector);
  }

  /**
   * Находит элемент по ID
   * @param {string} id - Идентификатор элемента
   * @returns {HTMLElement} - Найденный элемент или null
   */
  getElementById(id) {
    return document.getElementById(id);
  }

  /**
   * Получает текущий URL документа
   * @returns {string} - URL документа
   */
  getDocumentUrl() {
    return document.URL;
  }

  /**
   * Получает заголовок документа
   * @returns {string} - Заголовок документа
   */
  getDocumentTitle() {
    return document.title;
  }

  /**
   * Получает тип кодировки документа
   * @returns {string} - Тип кодировки
   */
  getDocumentCharset() {
    return document.characterSet;
  }

  /**
   * Проверяет, полностью ли загружен документ
   * @returns {boolean} - true, если документ загружен
   */
  isDocumentReady() {
    return document.readyState === 'complete';
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectDomService = PageObjectDomService;

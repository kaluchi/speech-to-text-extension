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
    
    // Устанавливаем атрибуты и стили
    for (const [key, value] of Object.entries(attributes)) {
      if (value != null) element.setAttribute(key, value);
    }
    
    for (const [key, value] of Object.entries(styles)) {
      if (value != null) element.style[key] = value;
    }
    
    // Устанавливаем текстовое содержимое
    if (textContent) element.textContent = textContent;
    
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
    element?.parentNode?.removeChild(element);
  }

  /**
   * Проверяет, является ли элемент редактируемым полем ввода
   * @param {HTMLElement} element - Проверяемый элемент
   * @returns {boolean} - true, если элемент является редактируемым полем
   */
  isEditableElement(element) {
    if (!element) return false;
    
    // Проверяем input, textarea или contenteditable
    const isInputOrTextarea = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
    return isInputOrTextarea ? !element.disabled && !element.readOnly : element.isContentEditable;
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
   * Добавляет обработчик события к window
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события (capture, once, passive)
   */
  addWindowEventListener(eventType, handler, options = {}) {
    window.addEventListener(eventType, handler, options);
  }

  /**
   * Удаляет обработчик события с window
   * @param {string} eventType - Тип события
   * @param {Function} handler - Функция обработчика
   * @param {Object} options - Опции события
   */
  removeWindowEventListener(eventType, handler, options = {}) {
    window.removeEventListener(eventType, handler, options);
  }

  /**
   * Получает URL текущей страницы
   * @returns {string} - URL текущей страницы
   */
  getLocationHref() {
    return window.location.href;
  }

}

// Экспортируем класс в глобальную область видимости
window.PageObjectDomService = PageObjectDomService;

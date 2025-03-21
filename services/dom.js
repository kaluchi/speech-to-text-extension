/**
 * Сервис для работы с DOM элементами
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
   * Добавляет элемент в родительский элемент
   * @param {HTMLElement} parent - Родительский элемент
   * @param {HTMLElement} child - Дочерний элемент
   * @returns {HTMLElement} - Добавленный элемент
   */
  appendChild(parent, child) {
    return parent.appendChild(child);
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
   * Очищает содержимое элемента
   * @param {HTMLElement} element - Элемент для очистки
   */
  clearElement(element) {
    if (element) {
      element.innerHTML = '';
    }
  }

  /**
   * Находит элемент по селектору
   * @param {string} selector - CSS селектор
   * @param {HTMLElement} parent - Родительский элемент (по умолчанию document)
   * @returns {HTMLElement|null} - Найденный элемент или null
   */
  querySelector(selector, parent = document) {
    return parent.querySelector(selector);
  }

  /**
   * Находит все элементы по селектору
   * @param {string} selector - CSS селектор
   * @param {HTMLElement} parent - Родительский элемент (по умолчанию document)
   * @returns {NodeList} - Список найденных элементов
   */
  querySelectorAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
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
   * Проверяет, находится ли элемент в видимой области
   * @param {HTMLElement} element - Проверяемый элемент
   * @returns {boolean} - true, если элемент видим
   */
  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetWidth > 0 && element.offsetHeight > 0;
  }

  /**
   * Получает или устанавливает текстовое содержимое элемента
   * @param {HTMLElement} element - Элемент
   * @param {string} [value] - Новое значение (если не указано, возвращает текущее)
   * @returns {string|undefined} - Текущее текстовое содержимое или undefined
   */
  textContent(element, value) {
    if (!element) return undefined;
    
    if (value !== undefined) {
      element.textContent = value;
      return undefined;
    }
    
    return element.textContent;
  }

  /**
   * Получает или устанавливает HTML содержимое элемента
   * @param {HTMLElement} element - Элемент
   * @param {string} [value] - Новое значение (если не указано, возвращает текущее)
   * @returns {string|undefined} - Текущее HTML содержимое или undefined
   */
  innerHTML(element, value) {
    if (!element) return undefined;
    
    if (value !== undefined) {
      element.innerHTML = value;
      return undefined;
    }
    
    return element.innerHTML;
  }

  /**
   * Устанавливает или снимает класс у элемента
   * @param {HTMLElement} element - Элемент
   * @param {string} className - Имя класса
   * @param {boolean} [state] - Состояние (true - добавить, false - удалить)
   */
  toggleClass(element, className, state) {
    if (!element) return;
    
    if (state === undefined) {
      element.classList.toggle(className);
    } else if (state) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectDomService = PageObjectDomService;

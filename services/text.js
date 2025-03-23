/**
 * Сервис для работы с текстом и вставки в различные элементы
 */
class PageObjectTextService {
  /**
   * Константы типов элементов для вставки
   */
  static ELEMENT_TYPE = {
    CONTENT_EDITABLE: 'contentEditable',
    INPUT: 'INPUT',
    TEXTAREA: 'TEXTAREA'
  };
  
  /**
   * События для генерации при изменении элементов
   */
  static EVENT = {
    INPUT: 'input',
    CHANGE: 'change'
  };
  
  /**
   * Создает экземпляр сервиса для работы с текстом
   * @param {PageObject} pageObject - Центральный объект PageObject
   */
  constructor(pageObject) {
    this._page = pageObject;
    this._restrictedDomains = [
      'google.com/recaptcha',
      'recaptcha.net',
      'accounts.google.com',
      'login.microsoftonline.com',
      'zoom.us/signin'
    ];
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Пустой метод для соответствия интерфейсу сервиса
  }

  /**
   * Вставка текста в активный элемент
   * @param {string} text - Текст для вставки
   * @returns {Promise<boolean>} - true, если вставка прошла успешно
   */
  async insertText(text = '') {
    const { logger, clipboard } = this._page;
    
    try {
      // Проверка и получение активного элемента
      const activeElement = this._getAndVerifyActiveElement();
      
      // Если нет подходящего элемента или страница ограничена, копируем в буфер
      if (!activeElement) {
        await clipboard.write(text);
        return false;
      }
      
      // Подготавливаем текст перед вставкой
      const preparedText = this._prepareTextForInsertion(text);
      
      // Вставляем текст в активный элемент
      this._insertIntoElement(activeElement, preparedText);
      
      // Генерация событий изменения
      this._dispatchChangeEvent(activeElement);
      
      return true;
    } catch (error) {
      // Обработка ошибок
      return this._handleInsertionError(error, text);
    }
  }
  
  /**
   * Получает и проверяет активный элемент
   * @returns {HTMLElement|null} - Активный элемент или null если недоступен
   * @private
   */
  _getAndVerifyActiveElement() {
    const { logger, dom } = this._page;
    
    // Получаем активный элемент
    const activeElement = dom.getActiveElement();
    
    // Логирование информации об активном элементе
    this._logActiveElementInfo(activeElement);
    
    // Проверка ограничений по домену
    const currentUrl = dom.getLocationHref();
    if (this._isPageRestricted(currentUrl)) {
      logger.info('Вставка текста запрещена на данном домене', currentUrl);
      return null;
    }
    
    // Проверка на редактируемость элемента
    if (!this._isEditableActiveElement(activeElement)) {
      return null;
    }
    
    return activeElement;
  }
  
  /**
   * Логирует информацию об активном элементе
   * @param {HTMLElement|null} activeElement - Активный элемент
   * @private
   */
  _logActiveElementInfo(activeElement) {
    const { logger } = this._page;
    
    logger.info(
      'Попытка вставки текста. Активный элемент:', 
      activeElement?.tagName || 'отсутствует', 
      'contentEditable:', activeElement?.isContentEditable || false
    );
  }
  
  /**
   * Проверяет, является ли активный элемент редактируемым
   * @param {HTMLElement|null} activeElement - Активный элемент для проверки
   * @returns {boolean} - true, если элемент можно редактировать
   * @private
   */
  _isEditableActiveElement(activeElement) {
    const { logger, dom } = this._page;
    
    // Проверяем доступность элемента, что это не body и что он редактируемый
    const isEditable = activeElement && activeElement !== dom.getBody() && dom.isEditableElement(activeElement);
    
    if (!isEditable) {
      // Для отладки логируем причину недоступности
      const reason = !activeElement ? 'отсутствует' : 
                     (activeElement === dom.getBody() ? 'это body' : 'не редактируемый элемент');
      logger.info(`Активный элемент не является редактируемым (причина: ${reason}), копируем в буфер обмена`);
    }
    
    return isEditable;
  }
  
  /**
   * Вставляет текст в активный элемент в зависимости от его типа
   * @param {HTMLElement} element - Элемент для вставки
   * @param {string} text - Подготовленный текст
   * @throws {Error} - При ошибке вставки
   * @private
   */
  _insertIntoElement(element, text) {
    const { logger } = this._page;
    const { ELEMENT_TYPE } = PageObjectTextService;
    
    if (element.isContentEditable) {
      this._insertIntoContentEditable(element, text);
    } else if (element.tagName === ELEMENT_TYPE.TEXTAREA || element.tagName === ELEMENT_TYPE.INPUT) {
      this._insertIntoFormField(element, text);
    } else {
      // Неизвестный тип элемента
      logger.warn('Неизвестный тип редактируемого элемента:', element.tagName);
      throw new Error('Неизвестный тип элемента');
    }
  }
  
  /**
   * Обрабатывает ошибки вставки текста
   * @param {Error} error - Возникшая ошибка
   * @param {string} text - Текст, который пытались вставить
   * @returns {boolean} - Всегда false (ошибка)
   * @private
   */
  async _handleInsertionError(error, text) {
    const { logger, clipboard } = this._page;
    
    logger.error('Ошибка при вставке текста:', error);
    
    // В случае ошибки пытаемся скопировать в буфер обмена
    try {
      await clipboard.write(text);
    } catch (clipboardError) {
      logger.error('Ошибка при копировании в буфер обмена:', clipboardError);
    }
    
    return false;
  }

  /**
   * Проверка, запрещена ли вставка текста на данном домене
   * @param {string} url - URL страницы
   * @returns {boolean} - true, если вставка запрещена
   * @private
   */
  _isPageRestricted(url = '') {
    return this._restrictedDomains.some(domain => url.includes(domain));
  }

  /**
   * Подготовка текста перед вставкой
   * @param {string} text - Исходный текст
   * @returns {string} - Подготовленный текст
   * @private
   */
  _prepareTextForInsertion(text = '') {
    // Удаляем начальные и конечные пробелы
    let trimmedText = text.trim();
    
    // Форматирование текста
    trimmedText = this._formatSpacingAndPunctuation(trimmedText);
    
    // Делаем первую букву заглавной, если это предложение
    trimmedText = this._capitalizeFirstLetter(trimmedText);
    
    return trimmedText;
  }
  
  /**
   * Форматирует пробелы и пунктуацию в тексте
   * @param {string} text - Исходный текст
   * @returns {string} - Отформатированный текст
   * @private
   */
  _formatSpacingAndPunctuation(text) {
    const activeElement = this._page.dom.getActiveElement();
    
    // Добавление пробелов при необходимости
    if (activeElement) {
      // Пробел в начале, если нужен
      if (this._shouldAddLeadingSpace(activeElement)) {
        text = ' ' + text;
      }
      
      // Пробел в конце, если нужен
      if (this._shouldAddTrailingSpace(activeElement)) {
        text = text + ' ';
      }
    }
    
    // Добавление точки в конце, если нужно
    if (this._shouldAddPeriod(text)) {
      text = text + '.';
    }
    
    return text;
  }

  /**
   * Проверка необходимости добавления пробела в начале или в конце текста
   * @param {HTMLElement} element - Элемент для проверки
   * @param {boolean} isLeading - true для проверки начала, false для конца
   * @returns {boolean} - true, если нужен пробел
   * @private
   */
  _shouldAddSpace(element, isLeading) {
    const { logger } = this._page;
    
    try {
      const currentText = this._getCurrentText(element);
      const cursorPos = this._getCursorPosition(element);
      
      // Быстрый выход для граничных случаев
      if (!currentText) return false;
      if (isLeading && cursorPos <= 0) return false;
      if (!isLeading && cursorPos >= currentText.length) return false;
      
      // Выбираем символ для проверки (перед или после курсора)
      const pos = isLeading ? cursorPos - 1 : cursorPos;
      const char = currentText.charAt(pos);
      
      // Пробел нужен, если символ не пробел, не перенос и не пустой
      return char !== ' ' && char !== '\n' && char !== '';
    } catch (error) {
      const spaceType = isLeading ? 'в начале' : 'в конце';
      logger.warn(`Ошибка при проверке необходимости добавления пробела ${spaceType}:`, error);
      return false;
    }
  }
  
  /**
   * Проверка, нужно ли добавить пробел в начале
   * @param {HTMLElement} element - Активный элемент
   * @returns {boolean} - true, если нужен пробел
   * @private
   */
  _shouldAddLeadingSpace(element) {
    return this._shouldAddSpace(element, true);
  }

  /**
   * Проверка, нужно ли добавить пробел в конце
   * @param {HTMLElement} element - Активный элемент
   * @returns {boolean} - true, если нужен пробел
   * @private
   */
  _shouldAddTrailingSpace(element) {
    return this._shouldAddSpace(element, false);
  }

  /**
   * Проверка, нужно ли добавить точку в конце
   * @param {string} text - Текст для проверки
   * @returns {boolean} - true, если нужна точка
   * @private
   */
  _shouldAddPeriod(text = '') {
    // Минимальная длина текста для добавления точки
    const MIN_TEXT_LENGTH = 10;
    
    // Добавляем точку только в длинный текст и если в конце нет знаков препинания
    return text.length >= MIN_TEXT_LENGTH && !/[.!?;:]$/.test(text);
  }

  /**
   * Делает первую букву заглавной
   * @param {string} text - Исходный текст
   * @returns {string} - Текст с заглавной первой буквой
   * @private
   */
  _capitalizeFirstLetter(text = '') {
    if (text.length === 0) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Получение текущего текста элемента
   * @param {HTMLElement} element - Элемент
   * @returns {string} - Текст элемента
   * @private
   */
  _getCurrentText(element) {
    const { ELEMENT_TYPE } = PageObjectTextService;
    
    if (element.isContentEditable) {
      return element.textContent || '';
    } else if (element.tagName === ELEMENT_TYPE.TEXTAREA || element.tagName === ELEMENT_TYPE.INPUT) {
      return element.value || '';
    }
    return '';
  }

  /**
   * Получение позиции курсора
   * @param {HTMLElement} element - Элемент
   * @returns {number} - Позиция курсора
   * @private
   */
  _getCursorPosition(element) {
    const { dom } = this._page;
    const { ELEMENT_TYPE } = PageObjectTextService;
    
    if (element.tagName === ELEMENT_TYPE.TEXTAREA || element.tagName === ELEMENT_TYPE.INPUT) {
      return element.selectionStart || 0;
    } else if (element.isContentEditable) {
      const selection = dom.getSelection();
      if (selection?.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        return this._getTextOffsetInContentEditable(element, range.startContainer, range.startOffset);
      }
    }
    return 0;
  }

  /**
   * Получение смещения текста в contenteditable
   * @param {HTMLElement} parent - Родительский элемент
   * @param {Node} node - Текущий узел
   * @param {number} offset - Смещение в узле
   * @returns {number} - Общее смещение
   * @private
   */
  _getTextOffsetInContentEditable(parent, node, offset) {
    let totalOffset = 0;
    
    // Рекурсивная функция для обхода дерева
    const traverse = (currentNode) => {
      if (currentNode === node) {
        totalOffset += offset;
        return true;
      }
      
      if (currentNode.nodeType === Node.TEXT_NODE) {
        totalOffset += currentNode.textContent?.length || 0;
      } else {
        for (let i = 0; i < (currentNode.childNodes?.length || 0); i++) {
          if (traverse(currentNode.childNodes[i])) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    traverse(parent);
    return totalOffset;
  }

  /**
   * Вставка текста в contenteditable элемент
   * @param {HTMLElement} element - Элемент для вставки
   * @param {string} text - Текст для вставки
   * @private
   */
  _insertIntoContentEditable(element, text = '') {
    const { logger, dom } = this._page;
    
    try {
      const selection = dom.getSelection();
      if (selection?.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Удаляем выделенный текст
        range.deleteContents();
        
        // Вставляем новый текст
        const textNode = dom.createTextNode(text);
        range.insertNode(textNode);
        
        // Устанавливаем курсор в конец вставленного текста
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        logger.info('Текст вставлен в contenteditable');
      }
    } catch (error) {
      logger.error('Ошибка при вставке в contenteditable:', error);
      throw error;
    }
  }

  /**
   * Вставка текста в поле формы (input, textarea)
   * @param {HTMLElement} element - Элемент для вставки
   * @param {string} text - Текст для вставки
   * @private
   */
  _insertIntoFormField(element, text = '') {
    const { logger } = this._page;
    
    try {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      
      // Объединяем текст
      const currentValue = element.value || '';
      element.value = currentValue.substring(0, start) + text + currentValue.substring(end);
      
      // Устанавливаем курсор в конец вставленного текста
      element.selectionStart = element.selectionEnd = start + text.length;
      
      logger.info('Текст вставлен в поле формы');
    } catch (error) {
      logger.error('Ошибка при вставке в поле формы:', error);
      throw error;
    }
  }

  /**
   * Генерация события изменения
   * @param {HTMLElement} element - Элемент, на котором генерируется событие
   * @private
   */
  _dispatchChangeEvent(element) {
    const { logger, dom } = this._page;
    const { EVENT, ELEMENT_TYPE } = PageObjectTextService;
    
    try {
      // Общее событие input для всех типов элементов
      dom.dispatchEvent(element, EVENT.INPUT, true);
      
      // Дополнительное событие change только для полей формы
      if (element.tagName === ELEMENT_TYPE.INPUT || element.tagName === ELEMENT_TYPE.TEXTAREA) {
        dom.dispatchEvent(element, EVENT.CHANGE, true);
      }
    } catch (error) {
      logger.warn('Ошибка при генерации события изменения:', error);
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectTextService = PageObjectTextService;
/**
 * Сервис для работы с текстом и вставки в различные элементы
 */
class PageObjectTextService {
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
  async insertText(text) {
    const { logger, clipboard, dom } = this._page;
    
    try {
      // Диагностика активного элемента
      const activeElement = dom.getActiveElement();
      logger.info(
        'Попытка вставки текста. Активный элемент:', 
        activeElement ? activeElement.tagName : 'отсутствует', 
        'contentEditable:', activeElement ? activeElement.isContentEditable : false
      );
      
      // Проверка ограничений по домену
      if (this._isPageRestricted(window.location.href)) {
        logger.info('Вставка текста запрещена на данном домене', window.location.href);
        await clipboard.write(text);
        return false;
      }
      
      // Проверка активного элемента
      const body = dom.getBody();
      if (!activeElement || activeElement === body || !dom.isEditableElement(activeElement)) {
        logger.info('Активный элемент не является редактируемым, причина:', 
          !activeElement ? 'отсутствует' : 
          (activeElement === body ? 'это body' : 'не редактируемый элемент'));
        logger.info('Активный элемент не является редактируемым, копируем в буфер обмена');
        await clipboard.write(text);
        return false;
      }
      
      // Подготавливаем текст перед вставкой
      const preparedText = this._prepareTextForInsertion(text);
      
      // Вставляем в зависимости от типа элемента
      if (activeElement.isContentEditable) {
        this._insertIntoContentEditable(activeElement, preparedText);
      } else if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
        this._insertIntoFormField(activeElement, preparedText);
      } else {
        // Неизвестный тип элемента
        logger.warn('Неизвестный тип редактируемого элемента:', activeElement.tagName);
        await clipboard.write(text);
        return false;
      }
      
      // Отправляем событие изменения
      this._dispatchChangeEvent(activeElement);
      
      return true;
    } catch (error) {
      logger.error('Ошибка при вставке текста:', error);
      
      // В случае ошибки пытаемся скопировать в буфер обмена
      try {
        await clipboard.write(text);
      } catch (clipboardError) {
        logger.error('Ошибка при копировании в буфер обмена:', clipboardError);
      }
      
      return false;
    }
  }

  /**
   * Проверка, запрещена ли вставка текста на данном домене
   * @param {string} url - URL страницы
   * @returns {boolean} - true, если вставка запрещена
   * @private
   */
  _isPageRestricted(url) {
    if (!url) return false;
    
    return this._restrictedDomains.some(domain => url.includes(domain));
  }

  /**
   * Подготовка текста перед вставкой
   * @param {string} text - Исходный текст
   * @returns {string} - Подготовленный текст
   * @private
   */
  _prepareTextForInsertion(text) {
    if (!text) return '';
    
    // Удаляем начальные и конечные пробелы
    let trimmedText = text.trim();
    
    // Проверяем, нужно ли добавить пробел в начале
    const activeElement = this._page.dom.getActiveElement();
    if (activeElement && this._shouldAddLeadingSpace(activeElement)) {
      trimmedText = ' ' + trimmedText;
    }
    
    // Проверяем, нужно ли добавить пробел в конце
    if (activeElement && this._shouldAddTrailingSpace(activeElement)) {
      trimmedText = trimmedText + ' ';
    }
    
    // Проверяем, нужно ли добавить точку в конце
    if (this._shouldAddPeriod(trimmedText)) {
      trimmedText = trimmedText + '.';
    }
    
    // Делаем первую букву заглавной, если это предложение
    trimmedText = this._capitalizeFirstLetter(trimmedText);
    
    return trimmedText;
  }

  /**
   * Проверка, нужно ли добавить пробел в начале
   * @param {HTMLElement} element - Активный элемент
   * @returns {boolean} - true, если нужен пробел
   * @private
   */
  _shouldAddLeadingSpace(element) {
    const { logger } = this._page;
    
    try {
      // Получаем текущий текст и позицию курсора
      const currentText = this._getCurrentText(element);
      const cursorPos = this._getCursorPosition(element);
      
      if (cursorPos <= 0 || !currentText) return false;
      
      // Проверяем символ перед курсором
      const charBeforeCursor = currentText.charAt(cursorPos - 1);
      return charBeforeCursor !== ' ' && charBeforeCursor !== '\n' && charBeforeCursor !== '';
    } catch (error) {
      logger.warn('Ошибка при проверке необходимости добавления пробела в начале:', error);
      return false;
    }
  }

  /**
   * Проверка, нужно ли добавить пробел в конце
   * @param {HTMLElement} element - Активный элемент
   * @returns {boolean} - true, если нужен пробел
   * @private
   */
  _shouldAddTrailingSpace(element) {
    const { logger } = this._page;
    
    try {
      // Получаем текущий текст и позицию курсора
      const currentText = this._getCurrentText(element);
      const cursorPos = this._getCursorPosition(element);
      
      if (!currentText || cursorPos >= currentText.length) return false;
      
      // Проверяем символ после курсора
      const charAfterCursor = currentText.charAt(cursorPos);
      return charAfterCursor !== ' ' && charAfterCursor !== '\n' && charAfterCursor !== '';
    } catch (error) {
      logger.warn('Ошибка при проверке необходимости добавления пробела в конце:', error);
      return false;
    }
  }

  /**
   * Проверка, нужно ли добавить точку в конце
   * @param {string} text - Текст для проверки
   * @returns {boolean} - true, если нужна точка
   * @private
   */
  _shouldAddPeriod(text) {
    if (!text || text.length < 10) return false; // Слишком короткий текст
    
    const lastChar = text.charAt(text.length - 1);
    return !/[.!?;:]/.test(lastChar); // Нет знака препинания в конце
  }

  /**
   * Делает первую букву заглавной
   * @param {string} text - Исходный текст
   * @returns {string} - Текст с заглавной первой буквой
   * @private
   */
  _capitalizeFirstLetter(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Получение текущего текста элемента
   * @param {HTMLElement} element - Элемент
   * @returns {string} - Текст элемента
   * @private
   */
  _getCurrentText(element) {
    if (element.isContentEditable) {
      return element.textContent;
    } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.value;
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
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      return element.selectionStart;
    } else if (element.isContentEditable) {
      const selection = dom.getSelection();
      if (selection.rangeCount > 0) {
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
        totalOffset += currentNode.textContent.length;
      } else {
        for (let i = 0; i < currentNode.childNodes.length; i++) {
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
  _insertIntoContentEditable(element, text) {
    const { logger, dom } = this._page;
    
    try {
      const selection = dom.getSelection();
      if (selection.rangeCount > 0) {
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
  _insertIntoFormField(element, text) {
    const { logger } = this._page;
    
    try {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      
      // Объединяем текст
      const currentValue = element.value;
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
    
    try {
      // Для input и textarea
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        dom.dispatchEvent(element, 'input', true);
        dom.dispatchEvent(element, 'change', true);
      } else if (element.isContentEditable) {
        // Для contenteditable
        dom.dispatchEvent(element, 'input', true);
      }
    } catch (error) {
      logger.warn('Ошибка при генерации события изменения:', error);
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectTextService = PageObjectTextService;

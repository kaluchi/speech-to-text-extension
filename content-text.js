// Функция для копирования текста в буфер обмена
async function copyToClipboard(text) {
  try {
    // Проверяем поддержку API
    if (!navigator.clipboard) {
      throw new Error('Clipboard API не поддерживается');
    }

    // Пробуем скопировать текст
    await navigator.clipboard.writeText(text);
    
    // Show notification about successful copying
    showCopyNotification(i18n.getTranslation('text_copied'));
    return true;
  } catch (error) {
    console.error('Ошибка при копировании в буфер обмена:', error);
    
    // Пробуем запасной метод через execCommand
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        showCopyNotification('Текст скопирован в буфер обмена');
        return true;
      } else {
        throw new Error('execCommand copy не сработал');
      }
    } catch (fallbackError) {
      console.error('Ошибка при использовании запасного метода копирования:', fallbackError);
      showCopyNotification(i18n.getTranslation('copy_failed'), true);
      return false;
    }
  }
}

// Функция для показа уведомления
function showCopyNotification(message, isError = false) {
  try {
    console.log(message);
  } catch (error) {
    console.error('Ошибка при показе уведомления:', error);
  }
}

// Функция для вставки текста в contenteditable элемент
function insertIntoContentEditable(element, text) {
  try {
    // Получаем текущее выделение
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Находим ближайший div-контейнер для текущей позиции курсора
      let currentNode = range.startContainer;
      let closestDiv = null;
      
      // Ищем ближайший div, двигаясь вверх по DOM-дереву
      while (currentNode && currentNode !== element) {
        if (currentNode.nodeType === Node.ELEMENT_NODE && 
            currentNode.tagName && currentNode.tagName.toLowerCase() === 'div') {
          closestDiv = currentNode;
          break;
        }
        currentNode = currentNode.parentNode;
      }
      
      // Определяем, откуда начинать поиск текста до курсора
      const startContainer = closestDiv || element;
      
      // Получаем текст до курсора в пределах найденного div или всего contenteditable
      const beforeCursorRange = range.cloneRange();
      if (startContainer === element) {
        // Если div не найден, используем весь contenteditable как и раньше
        beforeCursorRange.setStart(startContainer, 0);
      } else {
        // Используем найденный div как начальную точку
        try {
          // Пытаемся установить начало в начало div-а
          beforeCursorRange.setStart(startContainer, 0);
        } catch (e) {
          console.error("Ошибка при установке начала диапазона:", e);
          // Запасной вариант - используем весь contenteditable
          beforeCursorRange.setStart(element, 0);
        }
      }
      
      const beforeCursorText = beforeCursorRange.toString();
      console.log("Контекст до курсора (в пределах ближайшего div):", beforeCursorText);
      
      // Подготавливаем текст с учетом контекста
      const preparedText = prepareTextForInsertion(text, beforeCursorText);
      
      // Используем Document.execCommand для поддержки отмены
      document.execCommand('insertText', false, preparedText);
      
      console.log('Текст вставлен в contenteditable элемент с поддержкой отмены');
      return true;
    } else {
      console.log('Не удалось найти позицию курсора в contenteditable элементе');
      return false;
    }
  } catch (err) {
    console.error('Ошибка при вставке в contenteditable:', err);
    
    // Пробуем запасной метод
    try {
      // Получаем текущее выделение
      const selection = window.getSelection();
      
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Получаем текст до курсора для проверки знаков препинания
        const beforeCursorRange = range.cloneRange();
        beforeCursorRange.setStart(element, 0);
        const beforeCursorText = beforeCursorRange.toString();
        
        // Подготавливаем текст с учетом контекста
        const preparedText = prepareTextForInsertion(text, beforeCursorText);
        
        // Физически вставляем текст через DOM API
        range.deleteContents(); // Удаляем выделенное, если есть
        const textNode = document.createTextNode(preparedText);
        range.insertNode(textNode);
        
        // Устанавливаем курсор после вставленного текста
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Генерируем событие input для уведомления о вставке
        const inputEvent = new Event('input', {
          bubbles: true,
          cancelable: true
        });
        element.dispatchEvent(inputEvent);
        
        console.log('Текст вставлен в contenteditable элемент (запасной метод)');
        return true;
      }
      return false;
    } catch (backupErr) {
      console.error('Ошибка при использовании запасного метода:', backupErr);
      return false;
    }
  }
}

// Функция для вставки текста в обычные поля ввода (input, textarea)
function insertIntoInputField(element, text) {
  try {
    // Сохраняем текущие позиции, чтобы мы могли восстановить курсор после вставки
    const startPos = element.selectionStart;
    const endPos = element.selectionEnd;
    
    // Получаем текст до курсора
    const beforeCursorText = element.value.substring(0, startPos);
    
    // Подготавливаем текст с учетом контекста
    const preparedText = prepareTextForInsertion(text, beforeCursorText);
    
    // Используем Document.execCommand для поддержки отмены
    // Сначала устанавливаем фокус на элемент
    element.focus();
    
    // Если есть выделение, удаляем его с поддержкой отмены
    if (startPos !== endPos) {
      document.execCommand('delete', false);
    }
    
    // Вставляем подготовленный текст с поддержкой отмены
    document.execCommand('insertText', false, preparedText);
    
    console.log('Текст вставлен в текстовое поле с поддержкой отмены');
    return true;
  } catch (err) {
    console.error('Ошибка при использовании execCommand:', err);
    
    // Запасной метод с использованием setRangeText или прямой вставки
    try {
      if (typeof element.setRangeText === 'function') {
        // Получаем текст до курсора
        const beforeCursorText = element.value.substring(0, element.selectionStart);
        
        // Подготавливаем текст с учетом контекста
        const preparedText = prepareTextForInsertion(text, beforeCursorText);
        
        // Используем setRangeText для вставки в текущую позицию
        element.setRangeText(preparedText, element.selectionStart, element.selectionEnd, 'end');
        
        // Создаем событие input для уведомления о вставке текста
        const inputEvent = new InputEvent('input', { 
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: preparedText
        });
        element.dispatchEvent(inputEvent);
        
        console.log('Текст вставлен в текущую позицию курсора с помощью setRangeText');
        return true;
      } else {
        // Запасной вариант для старых браузеров
        const startPos = element.selectionStart;
        const endPos = element.selectionEnd;
        
        // Получаем текст до курсора
        const beforeCursorText = element.value.substring(0, startPos);
        
        // Подготавливаем текст с учетом контекста
        const preparedText = prepareTextForInsertion(text, beforeCursorText);
        
        // Ручная вставка текста
        const newValue = beforeCursorText + 
          preparedText + 
          element.value.substring(endPos);
        
        // Устанавливаем новое значение
        element.value = newValue;
        
        // Устанавливаем курсор после вставленного текста
        element.selectionStart = element.selectionEnd = startPos + preparedText.length;
        
        // Создаем событие input для уведомления о вставке текста
        const inputEvent = new InputEvent('input', { 
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: preparedText
        });
        element.dispatchEvent(inputEvent);
        
        console.log('Текст вставлен в текущую позицию курсора (запасной метод)');
        return true;
      }
    } catch (backupErr) {
      console.error('Ошибка при использовании запасного метода:', backupErr);
      return false;
    }
  }
}

// Функция для вставки текста в зависимости от типа элемента
function insertRecognizedText(element, text) {
  if (!element) return false;
  
  // Используем объект стратегий вместо цепочки if/else
  const insertStrategies = {
    'contenteditable': (el, txt) => insertIntoContentEditable(el, txt),
    'input': (el, txt) => insertIntoInputField(el, txt),
    'textarea': (el, txt) => insertIntoInputField(el, txt)
  };
  
  // Определяем тип элемента
  let elementType = null;
  if (element.getAttribute('contenteditable') === 'true') {
    elementType = 'contenteditable';
  } else if (element.tagName === 'INPUT' && ['text', 'search', ''].includes(element.type)) {
    elementType = 'input';
  } else if (element.tagName === 'TEXTAREA') {
    elementType = 'textarea';
  }
  
  // Применяем соответствующую стратегию
  return elementType ? insertStrategies[elementType](element, text) : false;
}

// Основная функция для вставки распознанного текста с поддержкой отмены (Cmd+Z)
function displayRecognizedText(text) {
  try {
    // Проверяем, на какой странице мы находимся
    if (isPageRestricted(window.location.href)) {
      console.log('Распознанный текст:', text);
      return; // На системных страницах только логируем
    }
    
    // Получаем активный элемент (элемент в фокусе)
    const activeElement = document.activeElement;
    
    // Проверяем, является ли активный элемент полем ввода
    if (isInputElement(activeElement)) {
      // Вставляем текст в элемент
      const success = insertRecognizedText(activeElement, text);
      
      // Если вставка не удалась, копируем в буфер обмена
      if (!success) {
        console.log('Не удалось вставить текст в элемент, копируем в буфер обмена');
        copyToClipboard(text);
      }
    } else {
      // Если нет подходящего поля в фокусе, копируем в буфер обмена
      copyToClipboard(text);
    }
  } catch (err) {
    console.error('Ошибка при обработке текста:', err);
    // Пробуем скопировать в буфер обмена даже при ошибке
    copyToClipboard(text);
  }
}

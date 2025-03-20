// Функция для проверки знака препинания
function isPunctuationMark(char) {
  // Список знаков препинания (только точка, вопросительный и восклицательный знаки)
  const punctuationMarks = ['.', '!', '?'];
  return punctuationMarks.includes(char);
}

// Функция для подготовки текста с учетом контекста
function prepareTextForInsertion(text, beforeCursor) {
  // Логируем входящие параметры
  console.log(`prepareTextForInsertion: text="${text}", beforeCursor="${beforeCursor}"`);
  
      // If text is empty, nothing to process
      if (!text || !text.trim()) {
        console.log(`prepareTextForInsertion: returning empty text="${text}"`);
        return text;
      }

  // Обрезаем лишние пробелы, переносы строк и др. в конце текста
  let trimmedText = text.replace(/^\s+/, '').replace(/\s+$/, '');
  console.log(`prepareTextForInsertion: после обрезки trimmedText="${trimmedText}"`);
  
  // Обрабатываем случай пустого контекста до курсора
  if (!beforeCursor || beforeCursor.trim() === '') {
    // Если текст начинается с новой мысли и мы в начале документа,
    // удаляем точку в конце, если она там есть
    if (trimmedText.endsWith('.')) {
      trimmedText = trimmedText.slice(0, -1);
      console.log(`prepareTextForInsertion: удалена точка в конце, trimmedText="${trimmedText}"`);
    }
    console.log(`prepareTextForInsertion: пустой контекст, возвращаем="${trimmedText}"`);
    return trimmedText;
  }
  
  // Проверяем, заканчивается ли текст переносом строки
  if (beforeCursor.endsWith('\n') || beforeCursor.endsWith('\r') || 
      beforeCursor.endsWith('\r\n') || beforeCursor.match(/\n\s*$/) || beforeCursor.match(/\r\s*$/)) {
    // Если перед курсором был перенос строки, не добавляем никаких разделителей
    console.log(`prepareTextForInsertion: обнаружен перенос строки, возвращаем="${trimmedText}"`);
    return trimmedText;
  }
  
  // Проверим последний символ перед курсором
  const lastChar = beforeCursor.charAt(beforeCursor.length - 1);
  console.log(`prepareTextForInsertion: последний символ="${lastChar}"`);
  
  // Если последний символ - знак препинания, добавляем пробел в начале
  if (isPunctuationMark(lastChar)) {
    const result = ' ' + trimmedText;
    console.log(`prepareTextForInsertion: после знака препинания, возвращаем="${result}"`);
    return result;
  } else {
    // Если последний символ не знак препинания (и контекст не пустой),
    // добавляем точку и пробел перед вставляемым текстом
    const result = '. ' + trimmedText;
    console.log(`prepareTextForInsertion: не после знака препинания, возвращаем="${result}"`);
    return result;
  }
}

// Функция для определения расширения файла по MIME-типу
function getFileExtension(mimeType) {
  const extensions = {
    'audio/mp4': 'mp4',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav'
  };
  
  const type = mimeType.split(';')[0];
  return extensions[type] || 'bin';
}

// Функция для проверки, является ли страница системной (chrome://, about:)
function isPageRestricted(url) {
  return url.startsWith('chrome://') || url.startsWith('about:');
}

// Функция для проверки, является ли элемент полем ввода
function isInputElement(element) {
  if (!element) return false;
  
  return (
    // Обычные текстовые поля
    (element.tagName === 'INPUT' && 
     (element.type === 'text' || element.type === 'search' || element.type === '')) ||
    element.tagName === 'TEXTAREA' ||
    // Элементы с contenteditable
    (element.getAttribute('contenteditable') === 'true')
  );
}

// Функция для получения понятного сообщения об ошибке
function getErrorMessageForMicrophone(error) {
  if (!error) {
    return i18n.getTranslation('unknown_error');
  }
  
  if (error.name) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return i18n.getTranslation('mic_access_denied');
        
      case "NotFoundError":
      case "DevicesNotFoundError":
        return i18n.getTranslation('mic_not_found');
        
      case "NotReadableError":
      case "TrackStartError":
        return i18n.getTranslation('mic_in_use');
        
      case "OverconstrainedError":
      case "ConstraintNotSatisfiedError":
        return i18n.getTranslation('technical_limitations');
        
      case "TypeError":
        return i18n.getTranslation('incorrect_data_type');
        
      default:
        return i18n.getTranslation('unknown_mic_error', error.name);
    }
  }
  
  return error.message || i18n.getTranslation('unknown_error');
}

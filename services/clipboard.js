/**
 * Сервис для работы с буфером обмена
 */
class PageObjectClipboardService {
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
   * Запись текста в буфер обмена
   * @param {string} text - Текст для копирования
   * @returns {Promise<boolean>} - true, если копирование прошло успешно
   */
  async write(text) {
    const { logger, ui, i18n } = this._page;
    
    try {
      if (!navigator.clipboard) {
        return this._legacyWrite(text);
      }
      
      await navigator.clipboard.writeText(text);
      logger.info('Текст скопирован в буфер обмена');
      
      // Показываем уведомление о копировании
      if (ui) {
        const message = i18n.getTranslation('copied_to_clipboard') || 'Текст скопирован в буфер обмена';
        ui.showNotification(message, 'success');
      }
      
      return true;
    } catch (error) {
      logger.error('Ошибка при копировании в буфер обмена:', error);
      
      // Пробуем запасной метод
      return this._legacyWrite(text);
    }
  }

  /**
   * Чтение текста из буфера обмена
   * @returns {Promise<string>} - Текст из буфера обмена
   */
  async read() {
    const { logger } = this._page;
    
    try {
      if (!navigator.clipboard) {
        throw new Error('API буфера обмена не поддерживается');
      }
      
      const text = await navigator.clipboard.readText();
      logger.info('Текст прочитан из буфера обмена');
      
      return text;
    } catch (error) {
      logger.error('Ошибка при чтении из буфера обмена:', error);
      throw error;
    }
  }

  /**
   * Запасной метод копирования в буфер обмена
   * @param {string} text - Текст для копирования
   * @returns {boolean} - true, если копирование прошло успешно
   * @private
   */
  _legacyWrite(text) {
    const { logger, ui, i18n } = this._page;
    
    try {
      // Создаем временный элемент
      const textarea = document.createElement('textarea');
      textarea.value = text;
      
      // Делаем элемент невидимым
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      // Копируем текст
      const successful = document.execCommand('copy');
      
      // Удаляем временный элемент
      document.body.removeChild(textarea);
      
      if (successful) {
        logger.info('Текст скопирован в буфер обмена (legacy)');
        
        // Показываем уведомление о копировании
        if (ui) {
          const message = i18n.getTranslation('copied_to_clipboard') || 'Текст скопирован в буфер обмена';
          ui.showNotification(message, 'success');
        }
        
        return true;
      } else {
        logger.warn('Не удалось скопировать текст в буфер обмена (legacy)');
        return false;
      }
    } catch (error) {
      logger.error('Ошибка при использовании запасного метода копирования:', error);
      return false;
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectClipboardService = PageObjectClipboardService;

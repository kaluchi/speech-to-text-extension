/**
 * Сервис для работы с уведомлениями
 */
class PageObjectNotificationsService {
  constructor(pageObject) {
    this._page = pageObject;
    this._defaultDuration = 3000; // Длительность показа уведомления по умолчанию (мс)
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Ничего не делаем при инициализации
  }

  /**
   * Показ информационного уведомления
   * @param {string} message - Текст уведомления
   * @param {number} [duration] - Длительность показа в мс
   */
  showInfo(message = '', duration = this._defaultDuration) {
    const { ui } = this._page;
    ui.showNotification(message, 'info', duration);
  }

  /**
   * Показ уведомления об успехе
   * @param {string} message - Текст уведомления
   * @param {number} [duration] - Длительность показа в мс
   */
  showSuccess(message = '', duration = this._defaultDuration) {
    const { ui } = this._page;
    ui.showNotification(message, 'success', duration);
  }

  /**
   * Показ предупреждающего уведомления
   * @param {string} message - Текст уведомления
   * @param {number} [duration] - Длительность показа в мс
   */
  showWarning(message = '', duration = this._defaultDuration) {
    const { ui } = this._page;
    ui.showNotification(message, 'warning', duration);
  }

  /**
   * Показ уведомления об ошибке
   * @param {string} message - Текст уведомления
   * @param {number} [duration] - Длительность показа в мс
   */
  showError(message = '', duration = this._defaultDuration) {
    const { ui } = this._page;
    ui.showNotification(message, 'error', duration);
  }

  /**
   * Отправка браузерного уведомления
   * @param {string} title - Заголовок уведомления
   * @param {Object} options - Опции уведомления
   * @returns {Promise<Notification|null>} - Объект уведомления или null
   */
  async sendBrowserNotification(title = '', options = {}) {
    const { logger } = this._page;
    
    try {
      // Проверяем поддержку и разрешение на отправку уведомлений
      if (!('Notification' in window)) {
        logger.warn('Браузерные уведомления не поддерживаются');
        return null;
      }
      
      // Запрашиваем разрешение, если оно не выдано
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
          logger.warn('Разрешение на отправку уведомлений не получено');
          return null;
        }
      }
      
      // Устанавливаем значок, если не указан
      if (!options.icon) {
        const manifest = chrome.runtime.getManifest();
        const iconUrl = manifest.icons && manifest.icons['48'];
        
        if (iconUrl) {
          options.icon = chrome.runtime.getURL(iconUrl);
        }
      }
      
      // Создаем и отправляем уведомление
      const notification = new Notification(title, options);
      
      // Автоматически закрываем через указанное время
      if (options.timeout) {
        setTimeout(() => notification.close(), options.timeout);
      }
      
      return notification;
    } catch (error) {
      logger.error('Ошибка при отправке браузерного уведомления:', error);
      return null;
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectNotificationsService = PageObjectNotificationsService;
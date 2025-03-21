/**
 * Сервис для работы с Chrome Extension API
 */
class PageObjectChromeService {
  constructor(pageObject) {
    this._page = pageObject;
    this._messageHandlers = new Map();
  }

  /**
   * Инициализация сервиса
   */
  init() {
    this._setupMessageListeners();
  }

  /**
   * Получить данные из хранилища
   * @param {Object|string|Array} keys - Ключи для получения
   * @param {string} storageArea - Область хранения ('sync', 'local', 'managed')
   * @returns {Promise<Object>} - Объект с полученными данными
   */
  async get(keys, storageArea = 'sync') {
    return new Promise((resolve) => {
      chrome.storage[storageArea].get(keys, resolve);
    });
  }

  /**
   * Сохранить данные в хранилище
   * @param {Object} items - Объект с данными для сохранения
   * @param {string} storageArea - Область хранения ('sync', 'local', 'managed')
   * @returns {Promise<void>} - Promise, который разрешается после сохранения
   */
  async set(items, storageArea = 'sync') {
    return new Promise((resolve) => {
      chrome.storage[storageArea].set(items, resolve);
    });
  }

  /**
   * Удалить данные из хранилища
   * @param {string|Array} keys - Ключи для удаления
   * @param {string} storageArea - Область хранения ('sync', 'local', 'managed')
   * @returns {Promise<void>} - Promise, который разрешается после удаления
   */
  async remove(keys, storageArea = 'sync') {
    return new Promise((resolve) => {
      chrome.storage[storageArea].remove(keys, resolve);
    });
  }

  /**
   * Отправить сообщение другому скрипту расширения
   * @param {Object} message - Сообщение для отправки
   * @returns {Promise<any>} - Promise с ответом на сообщение
   */
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Добавить обработчик сообщений
   * @param {string} messageType - Тип сообщения для обработки
   * @param {Function} handler - Обработчик сообщения
   */
  onMessage(messageType, handler) {
    this._messageHandlers.set(messageType, handler);
  }

  /**
   * Установка обработчиков сообщений
   * @private
   */
  _setupMessageListeners() {
    const { logger } = this._page;
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (logger) {
        logger.debug('Получено сообщение в content script:', request);
      }
      
      const messageType = request.command || request.type || 'unknown';
      
      if (this._messageHandlers.has(messageType)) {
        const handler = this._messageHandlers.get(messageType);
        
        // Обработка асинхронных обработчиков
        const result = handler(request, sender);
        
        if (result instanceof Promise) {
          // Для асинхронной обработки
          result
            .then(sendResponse)
            .catch((error) => {
              if (logger) {
                logger.error('Ошибка при обработке сообщения:', error);
              }
              sendResponse({ error: error.message });
            });
          
          return true; // Для асинхронного ответа
        } else {
          // Для синхронной обработки
          sendResponse(result);
        }
      }
    });
  }

  /**
   * Получить текущую активную вкладку
   * @returns {Promise<Object>} - Promise с объектом вкладки
   */
  async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        resolve(tab);
      });
    });
  }

  /**
   * Получить манифест расширения
   * @returns {Object} - Манифест расширения
   */
  getManifest() {
    return chrome.runtime.getManifest();
  }

  /**
   * Открыть страницу настроек расширения
   */
  openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectChromeService = PageObjectChromeService;

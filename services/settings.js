/**
 * Сервис для работы с настройками расширения
 */
class PageObjectSettingsService {
  constructor(pageObject) {
    this._page = pageObject;
    this._settings = {};
    this._defaultSettings = {
      apiKey: '',
      interfaceLanguage: 'auto',
      preferredMicrophoneId: '',
      autoDetectLanguage: true,
      debugAudio: false,
      logLevel: 'info',
      // API-настройки с нативными типами данных
      languageCode: 'ru',
      tagAudioEvents: false,  // Булево вместо строки
      timestampsGranularity: 'word',
      diarize: false,         // Булево вместо строки
      numSpeakers: 1,         // Число вместо строки
      biasedKeywords: [],
      enableRecordingMask: true  // Булево вместо строки
    };
    this._changeHandlers = new Map();
  }

  /**
   * Инициализация сервиса
   */
  async init() {
    await this.loadSettings();
    this._setupStorageListener();
  }

  /**
   * Загрузка настроек из хранилища
   * @returns {Promise<Object>} - Загруженные настройки
   */
  async loadSettings() {
    const { chrome, logger } = this._page;
    
    try {
      // Получаем актуальные настройки из хранилища
      const items = await chrome.get(this._defaultSettings);
      this._settings = { ...this._defaultSettings, ...items };
      
      logger.debug('Настройки загружены:', this._settings);
      
      return this._settings;
    } catch (error) {
      logger.error('Ошибка при загрузке настроек:', error);
      this._settings = { ...this._defaultSettings };
      return this._settings;
    }
  }

  /**
   * Получение значения настройки
   * @param {string} key - Ключ настройки
   * @returns {any} - Значение настройки
   */
  getValue(key) {
    return this._settings[key];
  }

  /**
   * Установка значения настройки
   * @param {string} key - Ключ настройки
   * @param {any} value - Новое значение
   * @returns {Promise<void>} - Promise, который разрешается после сохранения
   */
  async setValue(key, value) {
    const { chrome, logger } = this._page;
    
    if (this._settings[key] === value) {
      return; // Ничего не изменилось
    }
    
    const oldValue = this._settings[key];
    this._settings[key] = value;
    
    try {
      await chrome.set({ [key]: value });
      logger.debug(`Настройка ${key} изменена:`, value);
      
      // Уведомляем подписчиков об изменении
      this._notifyChangeHandlers(key, value, oldValue);
      
      return true;
    } catch (error) {
      logger.error(`Ошибка при сохранении настройки ${key}:`, error);
      // Возвращаем старое значение в случае ошибки
      this._settings[key] = oldValue;
      return false;
    }
  }

  /**
   * Получение всех настроек
   * @returns {Object} - Объект со всеми настройками
   */
  getAll() {
    return { ...this._settings };
  }

  /**
   * Сохранение всех настроек
   * @param {Object} newSettings - Новые настройки
   * @returns {Promise<boolean>} - Успешность сохранения
   */
  async saveAll(newSettings) {
    const { chrome, logger } = this._page;
    
    try {
      // Проверяем изменения и уведомляем подписчиков
      Object.entries(newSettings).forEach(([key, value]) => {
        if (this._settings[key] !== value) {
          const oldValue = this._settings[key];
          this._settings[key] = value;
          this._notifyChangeHandlers(key, value, oldValue);
        }
      });
      
      // Сохраняем в хранилище
      await chrome.set(newSettings);
      logger.debug('Все настройки сохранены');
      
      return true;
    } catch (error) {
      logger.error('Ошибка при сохранении всех настроек:', error);
      await this.loadSettings(); // Перезагружаем настройки в случае ошибки
      return false;
    }
  }



  /**
   * Проверка API ключа
   * @returns {Promise<boolean>} - true, если ключ существует
   */
  async checkApiKey() {
    const { logger, chrome } = this._page;
    const apiKey = this.getValue('apiKey');
    
    if (!apiKey) {
      logger.info('API ключ не найден');
      
      // Открываем страницу настроек вместо показа уведомления
      chrome.openOptionsPage();
      
      return false;
    }
    
    return true;
  }



  /**
   * Настройка слушателя изменений хранилища
   * @private
   */
  _setupStorageListener() {
    const { logger } = this._page;
    
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync') return;
      
      Object.entries(changes).forEach(([key, { newValue, oldValue }]) => {
        if (key in this._settings && this._settings[key] !== newValue) {
          this._settings[key] = newValue;
          logger.debug(`Настройка ${key} изменена извне:`, newValue);
          this._notifyChangeHandlers(key, newValue, oldValue);
        }
      });
    });
  }

  /**
   * Уведомление подписчиков об изменениях
   * @param {string} key - Ключ настройки
   * @param {any} newValue - Новое значение
   * @param {any} oldValue - Старое значение
   * @private
   */
  _notifyChangeHandlers(key, newValue, oldValue) {
    const { logger } = this._page;
    
    if (this._changeHandlers.has(key)) {
      this._changeHandlers.get(key).forEach(handler => {
        try {
          handler(newValue, oldValue);
        } catch (error) {
          logger.error(`Ошибка в обработчике изменения настройки ${key}:`, error);
        }
      });
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSettingsService = PageObjectSettingsService;
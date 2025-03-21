/**
 * Сервис для работы с локализацией и интернационализацией
 */
class PageObjectI18nService {
  constructor(pageObject) {
    this._page = pageObject;
    
    // Создаем экземпляр ядра локализации
    this._core = new LocalizationCore();
    
    // Перенаправляем window.i18n на методы этого сервиса для обратной совместимости
    window.i18n = {
      getTranslation: this.getTranslation.bind(this),
      setLanguage: this.setLanguage.bind(this),
      loadLanguageSetting: this.loadLanguageSetting.bind(this),
      applyTranslations: this.applyTranslations.bind(this),
      AVAILABLE_LANGUAGES: this._core._languages,
      getCurrentLanguage: () => this._core._currentLanguage
    };
  }

  /**
   * Инициализация сервиса
   */
  async init() {
    const { logger } = this._page;
    
    try {
      await this.loadLanguageSetting();
      logger.info(`Сервис локализации инициализирован (язык: ${this._core._currentLanguage})`);
    } catch (error) {
      logger.error('Ошибка при инициализации сервиса локализации:', error);
    }
  }

  /**
   * Получение перевода по ключу
   * @param {string} key - Ключ перевода
   * @param {...any} params - Параметры для подстановки
   * @returns {string} - Переведенная строка
   */
  getTranslation(key, ...params) {
    return this._core.getTranslation(key, ...params);
  }

  /**
   * Установка текущего языка
   * @param {string} lang - Код языка
   * @returns {boolean} - Успешность установки
   */
  setLanguage(lang) {
    const { logger } = this._page;
    
    const result = this._core.setLanguage(lang);
    if (result) {
      logger.info(`Язык изменен на: ${lang}`);
    }
    return result;
  }

  /**
   * Загрузка настроек языка из хранилища
   * @param {Function} callback - Функция обратного вызова
   * @returns {Promise<string>} - Promise с текущим языком
   */
  async loadLanguageSetting(callback) {
    const { logger } = this._page;
    
    try {
      const language = await this._core.loadLanguageSetting(callback);
      logger.debug(`Загружен язык из настроек: ${language}`);
      return language;
    } catch (error) {
      logger.error('Ошибка при загрузке настроек языка:', error);
      if (callback) callback(this._core._currentLanguage);
      return this._core._currentLanguage;
    }
  }

  /**
   * Применение переводов к DOM-элементам
   * @param {HTMLElement} rootElement - Корневой элемент
   */
  applyTranslations(rootElement = document) {
    this._core.applyTranslations(rootElement);
  }

  /**
   * Получение текущего языка
   * @returns {string} - Код текущего языка
   */
  getCurrentLanguage() {
    return this._core._currentLanguage;
  }

  /**
   * Получение списка доступных языков
   * @returns {Object} - Объект с доступными языками
   */
  getAvailableLanguages() {
    return this._core._languages;
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectI18nService = PageObjectI18nService;

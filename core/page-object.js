/**
 * Основной класс PageObject - легкий координатор, который создает и предоставляет 
 * доступ к сервисам для работы с DOM, событиями и API Chrome.
 */
class PageObject {
  constructor() {
    this._services = {};
    this._initialized = false;
    this._initializationPromise = null;
  }

  /**
   * Инициализирует все сервисы PageObject
   * @returns {Promise} - Promise, который разрешается, когда все сервисы инициализированы
   */
  async init() {
    if (this._initialized) return Promise.resolve();
    
    // Если инициализация уже запущена, возвращаем существующий Promise
    if (this._initializationPromise) return this._initializationPromise;
    
    this._initializationPromise = this._initializeServices();
    return this._initializationPromise;
  }

  /**
   * Приватный метод для инициализации сервисов в правильном порядке
   */
  async _initializeServices() {
    try {
      // Порядок инициализации важен! Некоторые сервисы зависят от других
      await this._initializeService('logger');
      await this._initializeService('chrome');
      await this._initializeService('settings');
      await this._initializeService('dom');
      await this._initializeService('events');
      await this._initializeService('media');
      await this._initializeService('ui');
      await this._initializeService('clipboard');
      await this._initializeService('text');
      await this._initializeService('notifications');
      await this._initializeService('audioAnalyzer');
      await this._initializeService('speechApi');
      
      // Инициализируем контроллер клавиатуры последним, так как он зависит от многих других сервисов
      await this._initializeService('keyboardController');
      
      this._initialized = true;
      if (this.logger) this.logger.info('PageObject полностью инициализирован');
      else console.log('PageObject полностью инициализирован');
      
      return true;
    } catch (error) {
      console.error('Ошибка при инициализации PageObject:', error);
      this._initializationPromise = null;
      throw error;
    }
  }

  /**
   * Инициализирует отдельный сервис
   * @param {string} serviceName - Имя сервиса для инициализации
   * @returns {Promise} - Promise, который разрешается сервисом
   */
  async _initializeService(serviceName) {
    if (this._services[serviceName]) return this._services[serviceName];

    try {
      // Получаем сервис из глобальной области видимости
      const globalServiceName = `PageObject${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)}Service`;
      const ServiceClass = window[globalServiceName];
      
      if (!ServiceClass) {
        throw new Error(`Сервис ${serviceName} не найден в глобальной области видимости`);
      }
      
      this._services[serviceName] = new ServiceClass(this);
      
      // Если у сервиса есть метод init, вызываем его
      if (typeof this._services[serviceName].init === 'function') {
        await this._services[serviceName].init();
      }
      
      // Создаем getter для удобного доступа (page.dom вместо page.getService('dom'))
      Object.defineProperty(this, serviceName, {
        get: () => this._services[serviceName]
      });
      
      if (this.logger && serviceName !== 'logger') {
        this.logger.info(`Сервис "${serviceName}" инициализирован`);
      } else if (serviceName === 'logger') {
        console.log(`Сервис "${serviceName}" инициализирован`);
      }
      
      return this._services[serviceName];
    } catch (error) {
      console.error(`Ошибка при инициализации сервиса "${serviceName}":`, error);
      throw error;
    }
  }

  /**
   * Публичный метод для получения сервиса по имени
   * @param {string} name - Имя сервиса
   * @returns {Object} - Экземпляр сервиса
   */
  getService(name) {
    return this._services[name];
  }
}

// Создаем глобальный класс
window.PageObject = PageObject;

/**
 * Сервис логирования для централизованной отладки
 */
class PageObjectLoggerService {
  constructor(pageObject) {
    this._page = pageObject;
    this._logLevel = this._getLogLevel();
    this._logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    this._prefix = '[SpeechToText]';
  }

  /**
   * Инициализация сервиса логирования
   */
  async init() {
    // В будущем здесь можно получить уровень логирования из настроек
    try {
      if (chrome?.storage) {
        const result = await new Promise(resolve => 
          chrome.storage.sync.get({ logLevel: 'info' }, resolve)
        );
        
        this._logLevel = result.logLevel;
        this.debug('LoggerService: установлен уровень логирования', this._logLevel);
      }
    } catch (e) {
      console.warn('LoggerService: ошибка при получении уровня логирования из хранилища');
      // Если не удалось получить настройки, используем уровень по умолчанию
    }
  }

  /**
   * Логировать отладочное сообщение
   * @param  {...any} args - Аргументы для логирования
   */
  debug(...args) {
    this._log('debug', ...args);
  }

  /**
   * Логировать информационное сообщение
   * @param  {...any} args - Аргументы для логирования
   */
  info(...args) {
    this._log('info', ...args);
  }

  /**
   * Логировать предупреждение
   * @param  {...any} args - Аргументы для логирования
   */
  warn(...args) {
    this._log('warn', ...args);
  }

  /**
   * Логировать ошибку
   * @param  {...any} args - Аргументы для логирования
   */
  error(...args) {
    this._log('error', ...args);
  }

  /**
   * Начать группировку логов
   * @param {string} label - Метка группы
   */
  group(label) {
    if (this._shouldLog('debug')) {
      console.group(`${this._prefix} ${label}`);
    }
  }

  /**
   * Закончить группировку логов
   */
  groupEnd() {
    if (this._shouldLog('debug')) {
      console.groupEnd();
    }
  }

  /**
   * Начать измерение времени
   * @param {string} label - Метка измерения
   */
  time(label) {
    if (this._shouldLog('debug')) {
      console.time(`${this._prefix} ${label}`);
    }
  }

  /**
   * Закончить измерение времени
   * @param {string} label - Метка измерения
   */
  timeEnd(label) {
    if (this._shouldLog('debug')) {
      console.timeEnd(`${this._prefix} ${label}`);
    }
  }

  /**
   * Внутренний метод для логирования
   * @param {string} level - Уровень логирования
   * @param  {...any} args - Аргументы для логирования
   */
  _log(level = 'info', ...args) {
    if (this._shouldLog(level)) {
      const prefix = `${this._prefix} [${level.toUpperCase()}]`;
      console[level](prefix, ...args);
    }
  }

  /**
   * Проверяет, должно ли сообщение быть залогировано
   * @param {string} level - Уровень сообщения
   * @returns {boolean} - true, если сообщение должно быть залогировано
   */
  _shouldLog(level) {
    return this._logLevels[level] >= this._logLevels[this._logLevel];
  }

  /**
   * Определяет уровень логирования по умолчанию
   * @returns {string} - Уровень логирования
   */
  _getLogLevel() {
    // В режиме разработки показываем все логи
    try {
      // Определяем режим по URL параметру
      if (window.location.search.includes('devMode=true')) {
        return 'debug';
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    return 'info';
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectLoggerService = PageObjectLoggerService;

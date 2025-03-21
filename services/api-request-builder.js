/**
 * Сервис для формирования запросов к API распознавания речи
 */
class PageObjectApiRequestBuilderService {
  constructor(pageObject) {
    this._page = pageObject;
    this._defaultLanguage = 'ru';
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Ничего не делаем при инициализации
  }

  /**
   * Создание FormData для запроса к API ElevenLabs
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<{formData: FormData, apiKey: string, language: string}>} - FormData для запроса
   */
  async createElevenLabsRequestData(audioBlob) {
    const { settings, logger } = this._page;
    
    // Получаем API ключ из настроек
    const apiKey = settings.getValue('apiKey');
    
    if (!apiKey) {
      throw new Error('API ключ не найден в настройках');
    }
    
    // Определяем язык для распознавания
    const language = this._determineLanguage();
    
    // Логируем начало создания запроса
    logger.info(`Подготовка запроса для распознавания, формат: ${audioBlob.type}, размер: ${audioBlob.size} байт, язык: ${language}`);
    
    // Создаем FormData для отправки
    const formData = new FormData();
    
    // Базовые параметры
    formData.append('file', audioBlob, 'speech.webm');
    formData.append('model_id', 'scribe_v1');
    formData.append('language_code', language);
    
    // Получаем настройки из хранилища
    const apiSettings = await this._loadApiSettings();
    
    // Настройки параметров и их значения
    const params = {
      // Параметр: [значение из настроек, добавлять ли при undefined]
      'tag_audio_events': [apiSettings.tag_audio_events, false],
      'timestamps_granularity': [apiSettings.timestamps_granularity, true],
      'diarize': [apiSettings.diarize, false]
      // Удаляем num_speakers из общего списка для отдельной обработки
    };
    
    // Добавляем параметры запроса
    for (const [param, [value, addIfUndefined]] of Object.entries(params)) {
      if (value !== undefined || addIfUndefined) {
        formData.append(param, value);
      }
    }
    
    // Специальная обработка для num_speakers
    if (apiSettings.num_speakers !== undefined && apiSettings.num_speakers !== '' && !isNaN(Number(apiSettings.num_speakers))) {
      const numSpeakers = Number(apiSettings.num_speakers);
      // Убедимся, что значение >= 1
      if (numSpeakers >= 1) {
        formData.append('num_speakers', numSpeakers);
        logger.info(`Установлено количество говорящих: ${numSpeakers}`);
      } else {
        logger.warn(`Некорректное значение num_speakers: ${numSpeakers}, должно быть >= 1. Не добавляем в запрос.`);
      }
    } else {
      // Значение не установлено, значит не добавляем этот параметр совсем
      logger.info('Параметр num_speakers не установлен, используем автоопределение');
    }
    
    // Добавляем ключевые слова
    if (apiSettings.biased_keywords?.length > 0) {
      formData.append('biased_keywords', JSON.stringify(apiSettings.biased_keywords));
    }
    
    // Отладка: логируем содержимое formData
    logger.info('Запрос к API сформирован с ключами:', [...formData.keys()]);
    logger.info('Настройки API для модели scribe_v1:', apiSettings);
    
    return { formData, apiKey, language };
  }

  /**
   * Загрузка настроек API из хранилища
   * @returns {Promise<Object>} - Настройки API
   * @private
   */
  async _loadApiSettings() {
    const { settings, logger } = this._page;
    
    try {
      // Собираем настройки API из отдельных ключей
      const apiSettings = {};
      
      // Функция для добавления настройки
      const addSetting = (apiKey, settingKey, transform = (x) => x) => {
        const value = settings.getValue(settingKey);
        if (value !== null && value !== undefined) {
          apiSettings[apiKey] = transform(value);
          logger.info(`Настройка ${apiKey}:`, value, '->', apiSettings[apiKey]);
        }
      };
      
      // Добавляем все настройки
      addSetting('tag_audio_events', 'tagAudioEvents', v => v === 'true');
      addSetting('timestamps_granularity', 'timestampsGranularity');
      addSetting('diarize', 'diarize', v => v === 'true');
      addSetting('num_speakers', 'numSpeakers', v => v === '' ? '' : Number(v));
      
      // Ключевые слова
      const biasedKeywords = settings.getValue('biasedKeywords');
      if (biasedKeywords && Array.isArray(biasedKeywords) && biasedKeywords.length > 0) {
        apiSettings.biased_keywords = biasedKeywords;
        logger.info('Настройка ключевых слов:', biasedKeywords);
      }
      
      // Проверяем, есть ли дополнительные настройки в elevenlabsApiSettings
      const extraSettings = settings.getValue('elevenlabsApiSettings');
      if (extraSettings && typeof extraSettings === 'string') {
        try {
          // Объединяем с настройками из JSON
          const parsed = JSON.parse(extraSettings);
          Object.assign(apiSettings, parsed);
          logger.info('Дополнительные настройки API:', parsed);
        } catch (e) {
          logger.warn('Ошибка при парсинге настроек API:', e);
        }
      }
      
      logger.info('Итоговые настройки API:', apiSettings);
      return apiSettings;
    } catch (error) {
      logger.warn('Ошибка при загрузке настроек API:', error);
      return {};
    }
  }

  /**
   * Определение языка для распознавания
   * @returns {string} - Код языка
   * @private
   */
  _determineLanguage() {
    const { settings, logger } = this._page;
    
    try {
      // Проверяем настройку автоопределения
      const autoDetect = settings.getValue('autoDetectLanguage');
      
      if (autoDetect === 'false') {
        // Используем предпочитаемый язык из настроек
        const preferred = settings.getValue('preferredLanguage');
        if (preferred) {
          return preferred;
        }
      }
      
      // Определяем язык по интерфейсу браузера
      const browserLang = navigator.language || navigator.userLanguage;
      
      if (browserLang) {
        const langCode = browserLang.split('-')[0].toLowerCase();
        
        // Упрощенная проверка поддерживаемых языков
        const supportedLangs = ['ru', 'en', 'fr', 'de', 'es', 'it', 'pt', 'pl', 'tr', 'nl'];
        
        if (supportedLangs.includes(langCode)) {
          return langCode;
        }
      }
      
      // По умолчанию русский
      return this._defaultLanguage;
    } catch (error) {
      logger.warn('Ошибка при определении языка:', error);
      return this._defaultLanguage;
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectApiRequestBuilderService = PageObjectApiRequestBuilderService;
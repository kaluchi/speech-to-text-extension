/**
 * Сервис для формирования запросов к API распознавания речи
 */
class PageObjectApiRequestBuilderService {
  /**
   * Константы ключей настроек API
   */
  static API_KEYS = {
    MODEL_ID: 'model_id',
    LANGUAGE_CODE: 'language_code',
    TAG_AUDIO_EVENTS: 'tag_audio_events',
    TIMESTAMPS_GRANULARITY: 'timestamps_granularity',
    DIARIZE: 'diarize',
    NUM_SPEAKERS: 'num_speakers',
    BIASED_KEYWORDS: 'biased_keywords'
  };
  
  /**
   * Константы ключей настроек расширения
   */
  static SETTINGS_KEYS = {
    API_KEY: 'apiKey',
    LANGUAGE_CODE: 'languageCode',
    TAG_AUDIO_EVENTS: 'tagAudioEvents',
    TIMESTAMPS_GRANULARITY: 'timestampsGranularity',
    DIARIZE: 'diarize',
    NUM_SPEAKERS: 'numSpeakers',
    BIASED_KEYWORDS: 'biasedKeywords'
  };

  /**
   * Создает экземпляр сервиса
   * @param {PageObject} pageObject - Центральный объект PageObject
   */
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
   * Создание FormData для запроса к API ElevenLabs
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<{formData: FormData, apiKey: string}>} - FormData для запроса и API ключ
   */
  async createElevenLabsRequestData(audioBlob) {
    const { logger } = this._page;
    
    // Получаем подготовленные настройки и API ключ
    const { apiSettings, apiKey } = await this._loadApiSettings();
    
    // Создаем FormData с аудиофайлом и параметрами
    const formData = this._createFormDataWithAudio(audioBlob, apiSettings);
    
    // Логируем информацию о запросе
    logger.info(`Подготовлен запрос для распознавания, формат: ${audioBlob.type}, размер: ${audioBlob.size} байт`);
    
    return { formData, apiKey };
  }

  /**
   * Создает FormData и добавляет в него аудиофайл и параметры API
   * @param {Blob} audioBlob - Аудиоданные
   * @param {Object} apiSettings - Настройки API
   * @returns {FormData} - Подготовленный объект FormData
   * @private
   */
  _createFormDataWithAudio(audioBlob, apiSettings) {
    // Создаем FormData для отправки
    const formData = new FormData();
    
    // Добавляем аудиофайл
    formData.append('file', audioBlob, 'speech.webm');
    
    // Добавляем все параметры API
    Object.entries(apiSettings).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    return formData;
  }

  /**
   * Загрузка и подготовка настроек API из хранилища
   * @returns {Promise<{apiSettings: Object, apiKey: string}>} - Настройки API и API ключ
   * @private
   */
  async _loadApiSettings() {
    const { settings, logger } = this._page;
    
    // Получаем и проверяем API ключ
    const apiKey = this._getAndValidateApiKey(settings);
    
    // Создаем пустой объект apiSettings для настроек
    const apiSettings = {};
    
    // Создаем вспомогательные функции для добавления настроек
    const helpers = this._createSettingHelpers(apiSettings, settings, logger);
    
    // Добавляем все необходимые настройки
    this._addBaseApiSettings(helpers);
    this._addUserSpecificSettings(helpers);
    this._addAdvancedSettings(helpers);
    
    // Логируем итоговые настройки для отладки
    logger.info('Итоговые настройки API:', apiSettings);
    
    return { apiSettings, apiKey };
  }
  
  /**
   * Получает и проверяет API ключ из настроек
   * @param {Object} settings - Сервис настроек
   * @returns {string} - API ключ
   * @throws {Error} - Если API ключ не найден
   * @private
   */
  _getAndValidateApiKey(settings) {
    const apiKey = settings.getValue(PageObjectApiRequestBuilderService.SETTINGS_KEYS.API_KEY);
    
    if (!apiKey) {
      throw new Error('API ключ не найден в настройках');
    }
    
    return apiKey;
  }
  
  /**
   * Создает вспомогательные функции для добавления настроек
   * @param {Object} apiSettings - Объект настроек API
   * @param {Object} settings - Сервис настроек
   * @param {Object} logger - Сервис логирования
   * @returns {Object} - Объект с вспомогательными функциями
   * @private
   */
  _createSettingHelpers(apiSettings, settings, logger) {
    // Функция для добавления настройки
    const addSetting = (apiKey, value, transform = (x) => x) => {
      const transformedValue = transform(value);
      // Добавляем только если transformedValue не null
      if (transformedValue !== null) {
        apiSettings[apiKey] = transformedValue;
        logger.info(`Настройка ${apiKey}:`, value, '->', transformedValue);
      }
    };
    
    // Функция для добавления настройки из settings
    const addSettingFromSettings = (apiKey, settingKey, transform = (x) => x) => {
      const value = settings.getValue(settingKey);
      addSetting(apiKey, value, transform);
    };
    
    return { addSetting, addSettingFromSettings };
  }
  
  /**
   * Добавляет базовые настройки API
   * @param {Object} helpers - Вспомогательные функции
   * @private
   */
  _addBaseApiSettings(helpers) {
    const { addSetting, addSettingFromSettings } = helpers;
    const { API_KEYS, SETTINGS_KEYS } = PageObjectApiRequestBuilderService;
    
    // Модель распознавания (фиксированная)
    addSetting(API_KEYS.MODEL_ID, 'scribe_v1');
    
    // Код языка из настроек
    addSettingFromSettings(API_KEYS.LANGUAGE_CODE, SETTINGS_KEYS.LANGUAGE_CODE);
  }
  
  /**
   * Добавляет настройки из пользовательских предпочтений
   * @param {Object} helpers - Вспомогательные функции
   * @private
   */
  _addUserSpecificSettings(helpers) {
    const { addSettingFromSettings } = helpers;
    const { API_KEYS, SETTINGS_KEYS } = PageObjectApiRequestBuilderService;
    
    // Тегирование аудио-событий (значение уже boolean)
    addSettingFromSettings(API_KEYS.TAG_AUDIO_EVENTS, SETTINGS_KEYS.TAG_AUDIO_EVENTS);
    
    // Проверяем значение granularity - не отправляем, если 'none'
    addSettingFromSettings(
      API_KEYS.TIMESTAMPS_GRANULARITY, 
      SETTINGS_KEYS.TIMESTAMPS_GRANULARITY, 
      v => v === 'none' ? null : v
    );
  }
  
  /**
   * Добавляет расширенные настройки для особых случаев
   * @param {Object} helpers - Вспомогательные функции
   * @private
   */
  _addAdvancedSettings(helpers) {
    const { addSettingFromSettings } = helpers;
    const { API_KEYS, SETTINGS_KEYS } = PageObjectApiRequestBuilderService;
    
    // Диаризация (определение говорящих)
    addSettingFromSettings(API_KEYS.DIARIZE, SETTINGS_KEYS.DIARIZE);
    
    // Количество говорящих
    addSettingFromSettings(API_KEYS.NUM_SPEAKERS, SETTINGS_KEYS.NUM_SPEAKERS);
    
    // Ключевые слова (отправляем только если массив не пустой)
    addSettingFromSettings(
      API_KEYS.BIASED_KEYWORDS, 
      SETTINGS_KEYS.BIASED_KEYWORDS, 
      keywords => Array.isArray(keywords) && keywords.length ? keywords : null
    );
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectApiRequestBuilderService = PageObjectApiRequestBuilderService;
/**
 * Сервис для формирования запросов к API распознавания речи
 */
class PageObjectApiRequestBuilderService {

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
    
    const { apiSettings, apiKey } = await this._loadApiSettings();
    const formData = this._createFormDataWithAudio(audioBlob, apiSettings);
    
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
    const formData = new FormData();
    
    formData.append('file', audioBlob, 'speech.webm');
    
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
    
    const apiKey = this._getAndValidateApiKey(settings);
    const apiSettings = {};
    
    const { addSetting, mapSettingToApi } = this._createSettingHelpers(apiSettings, settings, logger);
    
    // Модель распознавания (фиксированная)
    addSetting('model_id', 'scribe_v1');
    mapSettingToApi('language_code', 'languageCode');
    mapSettingToApi('tag_audio_events', 'tagAudioEvents');
    
    // Не отправляем granularity, если 'none'
    mapSettingToApi('timestamps_granularity', 'timestampsGranularity', v => v === 'none' ? null : v);
    
    // Диаризация и количество говорящих
    mapSettingToApi('diarize', 'diarize');
    mapSettingToApi('num_speakers', 'numSpeakers');
    
    // Включаем ключевые слова только если массив не пустой
    mapSettingToApi('biased_keywords', 'biasedKeywords', 
      keywords => Array.isArray(keywords) && keywords.length ? keywords : null);
    
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
    const apiKey = settings.getValue('apiKey');
    
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
    return {
      addSetting: (apiKey, value, transform = (x) => x) => {
        const transformedValue = transform(value);
        if (transformedValue !== null) {
          apiSettings[apiKey] = transformedValue;
          logger.info(`Настройка ${apiKey}:`, value, '->', transformedValue);
        }
      },
      
      mapSettingToApi: (apiKey, settingKey, transform = (x) => x) => {
        const value = settings.getValue(settingKey);
        apiSettings[apiKey] = transform(value) ?? null;
        if (apiSettings[apiKey] === null) delete apiSettings[apiKey];
        else logger.info(`Настройка ${apiKey}:`, value, '->', apiSettings[apiKey]);
      }
    };
  }
  

}

// Экспортируем класс в глобальную область видимости
window.PageObjectApiRequestBuilderService = PageObjectApiRequestBuilderService;
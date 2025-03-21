/**
 * Сервис для формирования запросов к API распознавания речи
 */
class PageObjectApiRequestBuilderService {
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
   * 
   * Ключевая ответственность: только заполнение formData обязательными полями
   * и вставка готовых значений из apiSettings. Без логирования или трансформации значений.
   */
  async createElevenLabsRequestData(audioBlob) {
    const { logger } = this._page;
    
    // Получаем подготовленные настройки и API ключ
    const { apiSettings, apiKey } = await this._loadApiSettings();
    
    // Создаем FormData для отправки
    const formData = new FormData();
    
    // Добавляем только аудиофайл
    formData.append('file', audioBlob, 'speech.webm');
    
    // Добавляем все подготовленные параметры без дополнительных проверок
    Object.entries(apiSettings).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Логируем информацию о запросе
    logger.info(`Подготовлен запрос для распознавания, формат: ${audioBlob.type}, размер: ${audioBlob.size} байт`);
    
    return { formData, apiKey };
  }

  /**
   * Загрузка и подготовка настроек API из хранилища
   * @returns {Promise<{apiSettings: Object, apiKey: string}>} - Настройки API и API ключ
   * @private
   * 
   * Ключевая ответственность: 
   * 1. Получение и проверка API ключа из настроек
   * 2. Формирование базовых параметров API (model_id, language_code)
   * 3. Добавление настроек API из пользовательских настроек
   * 4. Обработка специальных параметров (ключевые слова)
   * 5. Логирование итоговых настроек для отладки
   */
  async _loadApiSettings() {
    const { settings, logger } = this._page;
    
    // Получаем и проверяем API ключ
    const apiKey = settings.getValue('apiKey');
    
    if (!apiKey) {
      throw new Error('API ключ не найден в настройках');
    }
    
    // Создаем пустой объект apiSettings для настроек
    const apiSettings = {};
    
    // Функция для добавления настройки только при наличии значения
    const addSetting = (apiKey, value, transform = (x) => x) => {
      if (value !== null && value !== undefined) {
        const transformedValue = transform(value);
        apiSettings[apiKey] = transformedValue;
        logger.info(`Настройка ${apiKey}:`, value, '->', transformedValue);
      }
    };
    
    // Функция для добавления настройки из settings
    const addSettingFromSettings = (apiKey, settingKey, transform = (x) => x) => {
      const value = settings.getValue(settingKey);
      addSetting(apiKey, value, transform);
    };
    
    // 1. Добавляем базовые параметры API
    addSetting('model_id', 'scribe_v1');
    addSettingFromSettings('language_code', 'languageCode');
    
    // 2. Добавляем настройки из пользовательских настроек
    addSettingFromSettings('tag_audio_events', 'tagAudioEvents', v => v === 'true');
    addSettingFromSettings('timestamps_granularity', 'timestampsGranularity');
    addSettingFromSettings('diarize', 'diarize', v => v === 'true');
    addSettingFromSettings('num_speakers', 'numSpeakers', v => Number(v));
    addSettingFromSettings('biased_keywords', 'biasedKeywords', keywords => 
      Array.isArray(keywords) && keywords.length > 0 ? JSON.stringify(keywords) : null
    );
    
    // 4. Логируем итоговые настройки для отладки
    logger.info('Итоговые настройки API:', apiSettings);
    
    return { apiSettings, apiKey };
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectApiRequestBuilderService = PageObjectApiRequestBuilderService;
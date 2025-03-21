/**
 * Сервис для работы с API распознавания речи
 */
class PageObjectSpeechApiService {
  constructor(pageObject) {
    this._page = pageObject;
    this._apiEndpoint = 'https://api.elevenlabs.io/v1/speech-to-text';
    this._defaultLanguage = 'ru';
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Ничего не делаем при инициализации
  }

  /**
   * Отправка аудио в API ElevenLabs для распознавания
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<string>} - Распознанный текст
   */
  async sendToElevenLabsAPI(audioBlob) {
    try {
      // Получаем API ключ из настроек
      const apiKey = this._page.settings.getValue('apiKey');
      
      if (!apiKey) {
        throw new Error('API ключ не найден в настройках');
      }
      
      // Определяем язык для распознавания
      const language = this._determineLanguage();
      
      // Показываем индикатор обработки
      this._page.ui.changeMaskColor('rgba(255, 165, 0, 0.15)');
      
      // Логгируем начало запроса
      this._page.logger.info(`Отправка аудио для распознавания, формат: ${audioBlob.type}, размер: ${audioBlob.size} байт, язык: ${language}`);
      
      // Создаем FormData для отправки
      const formData = new FormData();
      
      // Используем ключ 'file' для файла аудио
      formData.append('file', audioBlob, 'speech.webm');
      
      // Используем актуальную модель
      formData.append('model_id', 'scribe_v1');
      
      // Получаем настройки из хранилища
      const settings = await this._loadApiSettings();
      
      // Добавляем каждый параметр отдельно
      
      // Добавляем язык как language_code
      formData.append('language_code', language);
      
      // Добавляем отметки аудио событий
      if (settings.tag_audio_events !== undefined) {
        formData.append('tag_audio_events', settings.tag_audio_events);
      }
      
      // Добавляем детализацию меток времени
      if (settings.timestamps_granularity) {
        formData.append('timestamps_granularity', settings.timestamps_granularity);
      }
      
      // Добавляем диаризацию
      if (settings.diarize !== undefined) {
        formData.append('diarize', settings.diarize);
      }
      
      // Добавляем количество говорящих
      if (settings.num_speakers) {
        formData.append('num_speakers', settings.num_speakers);
      }
      
      // Добавляем ключевые слова
      if (settings.biased_keywords && Array.isArray(settings.biased_keywords) && settings.biased_keywords.length > 0) {
        formData.append('biased_keywords', JSON.stringify(settings.biased_keywords));
      }
      
      // Отладка: логируем содержимое formData
      this._page.logger.info('Отправляем FormData с ключами:', [...formData.keys()]);
      this._page.logger.info('Настройки API для модели scribe_v1:', settings);
      
      // Отправляем запрос
      const response = await fetch(this._apiEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': apiKey
        },
        body: formData
      });
      
      // Проверяем успешность запроса
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      // Получаем результат
      const result = await response.json();
      
      if (!result || !result.text) {
        throw new Error('Пустой результат распознавания');
      }
      
      const recognizedText = result.text.trim();
      
      this._page.logger.info('Текст успешно распознан:', recognizedText);
      
      // Вставляем распознанный текст в активный элемент
      await this._page.text.insertText(recognizedText);
      
      return recognizedText;
    } catch (error) {
      this._page.logger.error('Ошибка при распознавании речи:', error);
      
      // Получаем сообщение об ошибке
      const errorMessage = this._getReadableErrorMessage(error);
      
      // Вставляем сообщение об ошибке в активное поле вместо показа уведомления
      await this._page.text.insertText(errorMessage);
      
      throw error;
    } finally {
      // Скрываем маску, если она еще видима
      this._page.ui.hideMask();
    }
  }

  /**
   * Загрузка настроек API из хранилища
   * @returns {Promise<Object>} - Настройки API
   * @private
   */
  async _loadApiSettings() {
    try {
      // Собираем настройки API из отдельных ключей
      const settings = {};
      
      // Настройка отметок аудио событий
      const tagAudioEvents = this._page.settings.getValue('tagAudioEvents');
      if (tagAudioEvents !== null && tagAudioEvents !== undefined) {
        settings.tag_audio_events = tagAudioEvents === 'true';
        this._page.logger.info('Настройка отметок аудио событий:', tagAudioEvents, '->', settings.tag_audio_events);
      }
      
      // Настройка детализации меток времени
      const timestampsGranularity = this._page.settings.getValue('timestampsGranularity');
      if (timestampsGranularity) {
        settings.timestamps_granularity = timestampsGranularity;
        this._page.logger.info('Настройка детализации меток времени:', timestampsGranularity);
      }
      
      // Настройка диаризации
      const diarize = this._page.settings.getValue('diarize');
      if (diarize !== null && diarize !== undefined) {
        settings.diarize = diarize === 'true';
        this._page.logger.info('Настройка диаризации:', diarize, '->', settings.diarize);
      }
      
      // Количество говорящих
      const numSpeakers = this._page.settings.getValue('numSpeakers');
      if (numSpeakers && !isNaN(Number(numSpeakers))) {
        settings.num_speakers = Number(numSpeakers);
        this._page.logger.info('Настройка количества говорящих:', numSpeakers, '->', settings.num_speakers);
      }
      
      // Ключевые слова
      const biasedKeywords = this._page.settings.getValue('biasedKeywords');
      if (biasedKeywords && Array.isArray(biasedKeywords) && biasedKeywords.length > 0) {
        settings.biased_keywords = biasedKeywords;
        this._page.logger.info('Настройка ключевых слов:', biasedKeywords);
      }
      
      // Проверяем, есть ли дополнительные настройки в elevenlabsApiSettings
      const apiSettings = this._page.settings.getValue('elevenlabsApiSettings');
      if (apiSettings && typeof apiSettings === 'string') {
        try {
          // Объединяем с настройками из JSON
          const extraSettings = JSON.parse(apiSettings);
          Object.assign(settings, extraSettings);
          this._page.logger.info('Дополнительные настройки API:', extraSettings);
        } catch (e) {
          this._page.logger.warn('Ошибка при парсинге настроек API:', e);
        }
      }
      
      this._page.logger.info('Итоговые настройки API:', settings);
      return settings;
    } catch (error) {
      this._page.logger.warn('Ошибка при загрузке настроек API:', error);
      return {};
    }
  }

  /**
   * Определение языка для распознавания
   * @returns {string} - Код языка
   * @private
   */
  _determineLanguage() {
    try {
      // Проверяем настройку автоопределения
      const autoDetect = this._page.settings.getValue('autoDetectLanguage');
      
      if (autoDetect === 'false') {
        // Используем предпочитаемый язык из настроек
        const preferred = this._page.settings.getValue('preferredLanguage');
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
      this._page.logger.warn('Ошибка при определении языка:', error);
      return this._defaultLanguage;
    }
  }

  /**
   * Получение читаемого сообщения об ошибке
   * @param {Error} error - Объект ошибки
   * @returns {string} - Читаемое сообщение
   * @private
   */
  _getReadableErrorMessage(error) {
    try {
      if (!error) {
        return window.i18n?.getTranslation('unknown_error') || 'Неизвестная ошибка';
      }
      
      const errorMessage = error.message || error.toString();
      
      // Обработка ошибки с отсутствием поля file
      if (errorMessage.includes('"file"],"msg":"Field required"')) {
        return 'Ошибка при отправке аудио: не удалось прикрепить файл';
      }
      
      // Обработка ошибки с неверным ID модели
      if (errorMessage.includes('invalid_model_id')) {
        return 'Ошибка API: используется устаревшая модель распознавания. Пожалуйста, обновите расширение.';
      }
      
      // Обработка ошибки с неверными опциями
      if (errorMessage.includes('options')) {
        return 'Ошибка API: некорректные параметры распознавания. Проверьте настройки.';
      }
      
      // Обработка типичных ошибок API
      if (errorMessage.includes('401')) {
        return window.i18n?.getTranslation('invalid_api_key') || 'Неверный API ключ';
      }
      
      if (errorMessage.includes('429')) {
        return window.i18n?.getTranslation('api_rate_limit') || 'Превышен лимит запросов API';
      }
      
      if (errorMessage.includes('500')) {
        return window.i18n?.getTranslation('server_error') || 'Ошибка сервера распознавания';
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        return window.i18n?.getTranslation('network_error') || 'Ошибка сети. Проверьте подключение к интернету';
      }
      
      return window.i18n?.getTranslation('speech_recognition_error', errorMessage) || 
             `Ошибка распознавания речи: ${errorMessage}`;
    } catch (e) {
      return window.i18n?.getTranslation('unknown_error') || 'Неизвестная ошибка';
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;

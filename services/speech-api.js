/**
 * Сервис для работы с API распознавания речи
 */
class PageObjectSpeechApiService {
  constructor(pageObject) {
    this._page = pageObject;
    this._apiEndpoint = 'https://api.elevenlabs.io/v1/speech-to-text';
  }

  /**
   * Инициализация сервиса
   */
  async init() {
    // Сервис apiRequestBuilder должен быть уже инициализирован в PageObject раньше speech-api
    // Поэтому нам не нужно его инициализировать здесь
    if (!this._page.apiRequestBuilder) {
      throw new Error('Требуемый сервис apiRequestBuilder не инициализирован');
    }
  }

  /**
   * Отправка аудио в API ElevenLabs для распознавания
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<string>} - Распознанный текст
   */
  async sendToElevenLabsAPI(audioBlob) {
    const { ui, apiRequestBuilder, logger, text } = this._page;
    
    try {
      // Показываем индикатор обработки
      ui.changeMaskColor('rgba(255, 165, 0, 0.15)');
      
      // Получаем данные для запроса
      const { formData, apiKey } = await apiRequestBuilder.createElevenLabsRequestData(audioBlob);
      
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
        let errorText = '';
        let errorJson = null;
        
        try {
          errorJson = await response.json();
          errorText = JSON.stringify(errorJson);
        } catch (e) {
          errorText = await response.text();
        }
        
        throw new Error(`Ошибка API: ${response.status} ${errorText}`);
      }
      
      // Получаем результат
      const result = await response.json();
      
      if (!result || !result.text) {
        throw new Error('Пустой результат распознавания');
      }
      
      const recognizedText = result.text.trim();
      
      logger.info('Текст успешно распознан:', recognizedText);
      
      // Вставляем распознанный текст в активный элемент
      await text.insertText(recognizedText);
      
      return recognizedText;
    } catch (error) {
      logger.error('Ошибка при распознавании речи:', error);
      
      // Получаем сообщение об ошибке
      const errorMessage = this._getReadableErrorMessage(error);
      
      // Вставляем сообщение об ошибке в активное поле вместо показа уведомления
      await text.insertText(errorMessage);
      
      throw error;
    } finally {
      // Скрываем маску, если она еще видима
      ui.hideMask();
    }
  }

  /**
   * Получение читаемого сообщения об ошибке
   * @param {Error} error - Объект ошибки
   * @returns {string} - Читаемое сообщение
   * @private
   */
  _getReadableErrorMessage(error) {
    const { i18n } = this._page;
    
    try {
      if (!error) {
        return i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
      }
      
      const errorMessage = error.message || error.toString();
      
      // Обработка ошибок валидации API (422)
      if (errorMessage.includes('422')) {
        // Проверка на ошибку с числом говорящих
        if (errorMessage.includes('num_speakers') && errorMessage.includes('greater than or equal')) {
          return i18n.getTranslation('num_speakers_error') || 
                'Ошибка в настройках: количество говорящих должно быть 1 или больше';
        }
        
        // Общая ошибка валидации
        return i18n.getTranslation('api_validation_error') || 
               'Ошибка валидации API: проверьте настройки расширения';
      }
      
      // Таблица соответствий ошибок
      const errorMap = {
        '"file"],"msg":"Field required"': 'Ошибка при отправке аудио: не удалось прикрепить файл',
        'invalid_model_id': 'Ошибка API: используется устаревшая модель распознавания. Пожалуйста, обновите расширение.',
        'options': 'Ошибка API: некорректные параметры распознавания. Проверьте настройки.',
        '401': i18n.getTranslation('invalid_api_key') || 'Неверный API ключ',
        '429': i18n.getTranslation('api_rate_limit') || 'Превышен лимит запросов API',
        '500': i18n.getTranslation('server_error') || 'Ошибка сервера распознавания',
        'network': i18n.getTranslation('network_error') || 'Ошибка сети. Проверьте подключение к интернету',
        'Failed to fetch': i18n.getTranslation('network_error') || 'Ошибка сети. Проверьте подключение к интернету'
      };
      
      // Ищем соответствие в таблице
      for (const [errorPattern, message] of Object.entries(errorMap)) {
        if (errorMessage.includes(errorPattern)) {
          return message;
        }
      }
      
      // Если ошибка известная, но нет перевода
      if (i18n.getTranslation('speech_recognition_error') !== 'speech_recognition_error') {
        return i18n.getTranslation('speech_recognition_error') || 
               'Ошибка распознавания речи';
      }
      
      // Вывод более читаемой ошибки, если перевод недоступен
      return 'Ошибка распознавания речи. Проверьте настройки или попробуйте позже.';
    } catch (e) {
      return i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;
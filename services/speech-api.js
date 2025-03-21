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
      const { formData, apiKey, language } = await apiRequestBuilder.createElevenLabsRequestData(audioBlob);
      
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
      
      return i18n.getTranslation('speech_recognition_error', errorMessage) || 
             `Ошибка распознавания речи: ${errorMessage}`;
    } catch (e) {
      return i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;

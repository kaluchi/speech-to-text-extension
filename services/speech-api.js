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
    if (!this._page.apiRequestBuilder) {
      throw new Error('Требуемый сервис apiRequestBuilder не инициализирован');
    }
  }

  /**
   * Отправка аудио в API ElevenLabs для распознавания
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<{result: string, ok: boolean}>} - Результат распознавания или ошибка
   */
  async sendToElevenLabsAPI(audioBlob) {
    try {
      // Отправляем запрос к API
      const response = await this._sendRequest(audioBlob);
      
      // Обрабатываем результат запроса
      if (response.ok) {
        const result = await this._extractRecognizedText(await response.json());
        return { result, ok: true };
      } else {
        const errorMessage = await this._handleApiError(response);
        return { result: errorMessage, ok: false };
      }
    } catch (error) {
      // Обрабатываем любые ошибки
      const errorMessage = this._formatErrorMessage(error);
      return { result: errorMessage, ok: false };
    }
  }

  /**
   * Отправляет запрос к API ElevenLabs
   * @private
   */
  async _sendRequest(audioBlob) {
    const { apiRequestBuilder } = this._page;
    const { formData, apiKey } = await apiRequestBuilder.createElevenLabsRequestData(audioBlob);
    
    return fetch(this._apiEndpoint, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': apiKey
      },
      body: formData
    });
  }

  /**
   * Извлекает распознанный текст из ответа API
   * @private
   */
  _extractRecognizedText(result) {
    const { logger } = this._page;
    
    const recognizedText = result.text.trim();
    logger.info('Текст успешно распознан:', recognizedText);
    return recognizedText;
  }

  /**
   * Форматирует сообщение об ошибке
   * @private
   */
  _formatErrorMessage(error) {
    const { logger, i18n } = this._page;
    
    logger.error('Ошибка при отправке аудио в API:', error);
    return error.message || i18n.getTranslation('api_error_unknown');
  }

  /**
   * Обрабатывает ошибки API ElevenLabs
   * @private
   */
  async _handleApiError(response) {
    try {
      // Получаем данные об ошибке
      const errorData = await response.json();
      
      // Логгирование ошибки
      this._page.logger.info('ElevenLabs API error', { 
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorData
      });
      
      // 1. Приоритет: локализованный текст по коду статуса из detail.status
      if (errorData && errorData.detail && errorData.detail.status) {
        const localizedMessage = this._page.i18n.getTranslation(errorData.detail.status);
        if (localizedMessage !== errorData.detail.status) { // Проверка существования перевода
          return localizedMessage;
        } else {
          return errorData.detail.message;
        }
      }
      
      // 2. Приоритет: строковое значение в detail
      if (errorData && errorData.detail && typeof errorData.detail === 'string') {
        return errorData.detail;
      }
      
      // 3. Приоритет: локализованное сообщение по HTTP-статусу
      const errorKey = `api_error_${response.status}`;
      const localizedHttpError = this._page.i18n.getTranslation(errorKey);
      if (localizedHttpError !== errorKey) {
        return localizedHttpError;
      }
      
      // Если ничего не подошло, возвращаем общее сообщение об ошибке
      return this._page.i18n.getTranslation('api_error_unknown');
      
    } catch (error) {
      // Ошибка при парсинге JSON или другая ошибка обработки
      this._page.logger.error('Error handling API error', error);
      
      // Проверка на ошибку сети
      if (!navigator.onLine) {
        return this._page.i18n.getTranslation('api_error_network');
      }
      
      return this._page.i18n.getTranslation('api_error_unknown');
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;
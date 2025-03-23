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
    const { i18n } = this._page;
    // Получаем данные об ошибке
    const errorData = await response.json();

    // Логгирование ошибки
    this._page.logger.info('ElevenLabs API error', { 
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      error: errorData
    });
    
    // Стратегии обработки ошибок в порядке приоритета
    const errorHandlingStrategies = [
      // Стратегия 1: Использовать код статуса из detail.status
      () => {
        if (errorData?.detail?.status) {
          const localizedMessage = i18n.getTranslation(errorData.detail.status);
          return localizedMessage !== errorData.detail.status ? 
            localizedMessage : errorData.detail.message;
        }
        return null;
      },
      
      // Стратегия 2: Использовать HTTP статус
      () => {
        const errorKey = `api_error_${response.status}`;
        const localizedHttpError = i18n.getTranslation(errorKey);
        return localizedHttpError !== errorKey ? localizedHttpError : null;
      },
      
      // Стратегия 3: Вернуть общую ошибку
      () => i18n.getTranslation('api_error_unknown')
    ];
    
    // Применяем стратегии последовательно
    for (const strategy of errorHandlingStrategies) {
      const result = strategy();
      if (result) return result;
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;
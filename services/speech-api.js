/**
 * Сервис для работы с API распознавания речи ElevenLabs
 * 
 * Отвечает за непосредственное взаимодействие с Speech-to-Text API,
 * включая отправку аудиоданных, обработку ответов и обработку ошибок.
 * Использует apiRequestBuilder для подготовки параметров запроса.
 * 
 * @see https://docs.elevenlabs.io/api-reference/speech-to-text
 */
class PageObjectSpeechApiService {
  /**
   * Создает экземпляр сервиса
   * @param {PageObject} pageObject - Центральный объект PageObject
   */
  constructor(pageObject) {
    this._page = pageObject;
    this._apiEndpoint = 'https://api.elevenlabs.io/v1/speech-to-text';
  }

  /**
   * Инициализация сервиса
   * Проверяет наличие необходимых зависимостей
   * @throws {Error} Если отсутствует сервис apiRequestBuilder
   */
  async init() {
    if (!this._page.apiRequestBuilder) {
      throw new Error('Требуемый сервис apiRequestBuilder не инициализирован');
    }
  }

  /**
   * Отправка аудио в API ElevenLabs для распознавания
   * 
   * Этот метод выполняет полный цикл распознавания речи:
   * 1. Формирует и отправляет запрос к API
   * 2. Обрабатывает успешный ответ или ошибки
   * 3. Возвращает результат в унифицированном формате
   * 
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<{result: string, ok: boolean}>} - Результат распознавания или сообщение об ошибке
   */
  async sendToElevenLabsAPI(audioBlob) {
    try {
      // Отправляем запрос к API
      const response = await this._sendRequest(audioBlob);
      
      // Обрабатываем результат запроса
      if (response.ok) {
        const result = await this._extractRecognizedText(await response.json());
        return { result, ok: true };
      } 
      
      const errorMessage = await this._handleApiError(response);
      return { result: errorMessage, ok: false };
    } catch (error) {
      // Обрабатываем любые ошибки
      return { 
        result: this._formatErrorMessage(error), 
        ok: false 
      };
    }
  }

  /**
   * Отправляет запрос к API ElevenLabs
   * 
   * Использует apiRequestBuilder для создания FormData и получения API ключа,
   * затем выполняет HTTP-запрос к endpoint API.
   * 
   * @param {Blob} audioBlob - Аудиоданные для отправки
   * @returns {Promise<Response>} - Promise с ответом HTTP-запроса
   * @private
   */
  async _sendRequest(audioBlob) {
    const { formData, apiKey } = await this._page.apiRequestBuilder.createElevenLabsRequestData(audioBlob);
    
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
   * Извлекает распознанный текст из успешного ответа API
   * 
   * @param {Object} result - Разобранный JSON-ответ от API
   * @returns {string} - Распознанный и обработанный текст
   * @private
   */
  _extractRecognizedText(result) {
    const { logger } = this._page;
    
    const recognizedText = result.text.trim();
    logger.info('Текст успешно распознан:', recognizedText);
    return recognizedText;
  }

  /**
   * Форматирует сообщение об ошибке для пользователя
   * 
   * Используется при сетевых ошибках и других исключениях,
   * которые могут возникнуть при отправке запроса.
   * 
   * @param {Error} error - Объект ошибки
   * @returns {string} - Отформатированное сообщение об ошибке
   * @private
   */
  _formatErrorMessage(error) {
    const { logger, i18n } = this._page;
    
    logger.error('Ошибка при отправке аудио в API:', error);
    return error.message || i18n.getTranslation('api_error_unknown');
  }

  /**
   * Обрабатывает ошибки API ElevenLabs
   * 
   * Реализует многоуровневую стратегию обработки ошибок:
   * 1. Сначала пытается получить локализованное сообщение по коду из detail.status
   * 2. Затем пытается получить локализованное сообщение по HTTP статус-коду
   * 3. В крайнем случае возвращает общее сообщение об ошибке
   * 
   * @param {Response} response - Ответ HTTP с ошибкой (не 2xx)
   * @returns {Promise<string>} - Локализованное сообщение об ошибке
   * @private
   */
  async _handleApiError(response) {
    const { logger, i18n } = this._page;
    
    try {
      // Получаем данные об ошибке
      const errorData = await response.json();

      // Логгирование ошибки
      logger.info('ElevenLabs API error', { 
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        error: errorData
      });
      
      // Стратегия 1: Использовать код статуса из detail.status
      if (errorData?.detail?.status) {
        const localizedMessage = i18n.getTranslation(errorData.detail.status);
        // Если нашли локализацию, возвращаем её, иначе сообщение из API
        return localizedMessage !== errorData.detail.status 
          ? localizedMessage 
          : (errorData.detail.message || i18n.getTranslation('api_error_unknown'));
      }
      
      // Стратегия 2: Использовать HTTP статус
      const errorKey = `api_error_${response.status}`;
      const localizedHttpError = i18n.getTranslation(errorKey);
      if (localizedHttpError !== errorKey) {
        return localizedHttpError;
      }
    } catch (error) {
      logger.error('Ошибка при обработке JSON из ответа с ошибкой:', error);
    }
    
    // Стратегия 3: Общая ошибка
    return i18n.getTranslation('api_error_unknown');
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;
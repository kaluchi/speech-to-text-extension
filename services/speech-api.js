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
   */
  async sendToElevenLabsAPI(audioBlob) {
    const { ui, text } = this._page;
    
    try {
      ui.changeMaskColor('rgba(255, 165, 0, 0.15)');
      const response = await this._sendRequest(audioBlob);
      const resultText = await this._processResponse(response);
      await text.insertText(resultText);
      return resultText;
    } catch (error) {
      return this._handleGeneralError(error);
    } finally {
      ui.hideMask();
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
   * Обрабатывает ответ от API
   * @private
   */
  async _processResponse(response) {
    const { text } = this._page;
    
    if (response.ok) {
      return this._extractRecognizedText(await response.json());
    } else {
      const errorMessage = await this.handleApiError(response);
      await text.insertText(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Извлекает распознанный текст из ответа API
   * @private
   */
  _extractRecognizedText(result) {
    const { logger } = this._page;
    
    if (!result || !result.text) {
      throw new Error('Пустой результат распознавания');
    }
    
    const recognizedText = result.text.trim();
    logger.info('Текст успешно распознан:', recognizedText);
    return recognizedText;
  }

  /**
   * Обрабатывает общие ошибки
   * @private
   */
  async _handleGeneralError(error) {
    const { logger, text, i18n } = this._page;
    
    logger.error('Ошибка при отправке аудио в API:', error);
    const errorMessage = error.message || i18n.getTranslation('api_error_unknown');
    await text.insertText(errorMessage);
    return errorMessage;
  }

  /**
   * Обрабатывает ошибки API ElevenLabs
   * @param {Response} response - Объект ответа от fetch
   * @returns {Promise<string>} - Локализованное сообщение об ошибке
   */
  async handleApiError(response) {
    try {
      // Получаем данные об ошибке из ответаs
      const errorData = await response.json();
      
      // Логгирование ошибки с деталями для отладки
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
      
      // Если до 401 статуса - открыть настройки
      if (response.status === 401) {
        // Проверка наличия API ключа
        const apiKey = this._page.settings.getValue('apiKey');
        if (!apiKey) {
          return this._page.i18n.getTranslation('api_error_missing_key');
        }
        
        // Открыть страницу настроек при проблемах с API ключом
        this._page.chrome.openOptionsPage();
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
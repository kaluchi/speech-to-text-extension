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
      if (response.ok) {
        // Получаем результат
        const result = await response.json();
        
        if (!result || !result.text) {
          throw new Error('Пустой результат распознавания');
        }
        
        const recognizedText = result.text.trim();
        
        // Логируем успешное распознавание
        logger.info('Текст успешно распознан:', recognizedText);
        
        // Вставляем распознанный текст в активный элемент
        await text.insertText(recognizedText);
        
        return recognizedText;
      } else {
        // Обрабатываем ошибку API
        const errorMessage = await this.handleApiError(response);
        
        // Вставляем сообщение об ошибке в активное поле вместо показа уведомления
        await text.insertText(errorMessage);
        
        return errorMessage;
      }
    } catch (error) {
      // Обрабатываем любые другие ошибки
      logger.error('Ошибка при отправке аудио в API:', error);
      
      const errorMessage = error.message || this._page.i18n.getTranslation('api_error_unknown');
      await text.insertText(errorMessage);
      
      return errorMessage; 
    } finally {
      // Скрываем маску, если она еще видима
      ui.hideMask();
    }
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
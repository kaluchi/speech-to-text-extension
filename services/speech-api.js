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
    // Ничего не делаем при инициализации
    await this._page._initializeService('apiRequestBuilder');
  }

  /**
   * Отправка аудио в API ElevenLabs для распознавания
   * @param {Blob} audioBlob - Аудиоданные для распознавания
   * @returns {Promise<string>} - Распознанный текст
   */
  async sendToElevenLabsAPI(audioBlob) {
    try {
      // Показываем индикатор обработки
      this._page.ui.changeMaskColor('rgba(255, 165, 0, 0.15)');
      
      // Получаем данные для запроса
      const { formData, apiKey, language } = await this._page.apiRequestBuilder.createElevenLabsRequestData(audioBlob);
      
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
   * Получение читаемого сообщения об ошибке
   * @param {Error} error - Объект ошибки
   * @returns {string} - Читаемое сообщение
   * @private
   */
  _getReadableErrorMessage(error) {
    try {
      if (!error) {
        return this._page.i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
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
        return this._page.i18n.getTranslation('invalid_api_key') || 'Неверный API ключ';
      }
      
      if (errorMessage.includes('429')) {
        return this._page.i18n.getTranslation('api_rate_limit') || 'Превышен лимит запросов API';
      }
      
      if (errorMessage.includes('500')) {
        return this._page.i18n.getTranslation('server_error') || 'Ошибка сервера распознавания';
      }
      
      if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        return this._page.i18n.getTranslation('network_error') || 'Ошибка сети. Проверьте подключение к интернету';
      }
      
      return this._page.i18n.getTranslation('speech_recognition_error', errorMessage) || 
             `Ошибка распознавания речи: ${errorMessage}`;
    } catch (e) {
      return this._page.i18n.getTranslation('unknown_error') || 'Неизвестная ошибка';
    }
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectSpeechApiService = PageObjectSpeechApiService;

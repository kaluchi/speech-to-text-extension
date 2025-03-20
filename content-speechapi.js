// Функция для отправки аудио в ElevenLabs API
async function sendToElevenLabsAPI(audioBlob) {
  try {
    // Убедимся, что у нас есть запись
    if (!audioBlob || audioBlob.size === 0) {
      console.error("Пустая запись, нечего отправлять в API");
      return;
    }
    
    // Check for API key
    if (!settings.apiKey) {
      console.warn("ElevenLabs API key not provided");
      displayRecognizedText(i18n.getTranslation('missing_api_key'));
      return;
    }
    
    console.log("Отправка аудио в ElevenLabs API для распознавания речи...");
    
    // ElevenLabs API endpoint для Speech-to-Text
    // Документация: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
    const apiUrl = "https://api.elevenlabs.io/v1/speech-to-text";
    
    // Создаем FormData для отправки аудио
    const formData = new FormData();
    
    // Обязательные параметры
    formData.append('model_id', 'scribe_v1'); // Единственная доступная модель
    formData.append('file', audioBlob, `recording.${getFileExtension(audioBlob.type)}`);
    
    // Добавляем пользовательские настройки
    formData.append('tag_audio_events', settings.tagAudioEvents);
    
    // Добавляем код языка, если он задан
    if (settings.languageCode) {
      formData.append('language_code', settings.languageCode);
    }

    // Добавляем детализацию временных меток
    if (settings.timestampsGranularity && settings.timestampsGranularity !== 'none') {
      formData.append('timestamps_granularity', settings.timestampsGranularity);
    }

    // Добавляем разметку говорящих
    if (settings.diarize === 'true') {
      formData.append('diarize', true);
    }

    // Добавляем количество говорящих, если указано
    if (settings.numSpeakers) {
      formData.append('num_speakers', parseInt(settings.numSpeakers));
    }

    // Добавляем ключевые слова, если есть
    if (settings.biasedKeywords && settings.biasedKeywords.length > 0) {
      formData.append('biased_keywords', JSON.stringify(settings.biasedKeywords));
    }
    
    // Отправляем запрос
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': settings.apiKey,
        // Content-Type будет установлен автоматически при использовании FormData
      },
      body: formData
    });
    
    // Обрабатываем ответ
    if (response.ok) {
      const result = await response.json();
      console.log("Распознавание успешно:", result);
      
      // Отображаем распознанный текст
      displayRecognizedText(result.text || "Текст не распознан");
      
      // Также воспроизводим запись локально
      // playRecording(audioBlob);
    } else {
      // Обрабатываем ошибку, пытаемся извлечь сообщение из JSON
      try {
        // Пробуем сначала получить JSON
        const errorText = await response.text();
        console.error("Ошибка распознавания:", response.status, errorText);
        
        // Пытаемся разобрать JSON, чтобы извлечь сообщение об ошибке
        try {
          const errorJson = JSON.parse(errorText);
          
          // Проверяем разные возможные структуры JSON ошибки
          let errorMessage = "";
          
          // Структура как в примере с unusual_activity
          if (errorJson.detail && errorJson.detail.message) {
            errorMessage = errorJson.detail.message;
          } 
          // Общая структура для многих API
          else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
          // Структура с error и message
          else if (errorJson.error && errorJson.error.message) {
            errorMessage = errorJson.error.message;
          }
          // Структура с errors массивом
          else if (errorJson.errors && errorJson.errors.length > 0) {
            errorMessage = errorJson.errors[0].message || JSON.stringify(errorJson.errors);
          }
          
          // Если удалось извлечь сообщение, отображаем его как распознанный текст
          if (errorMessage) {
            console.log("Извлечено сообщение об ошибке:", errorMessage);
            displayRecognizedText(errorMessage);
          } else {
            // Если сообщение не удалось извлечь, но JSON есть
            displayRecognizedText("Ошибка API: " + JSON.stringify(errorJson));
          }
        } catch (jsonError) {
          // Если не удалось разобрать JSON, используем текст ошибки как есть
          console.log("Не удалось разобрать ответ как JSON:", jsonError);
          displayRecognizedText("Ошибка API: " + errorText);
        }
      } catch (textError) {
        // В случае ошибки при получении текста ответа
        console.error("Не удалось получить текст ошибки:", textError);
        displayRecognizedText("Ошибка API: " + response.status);
      }
      
      // При ошибке воспроизводим аудио локально
      // playRecording(audioBlob);
    }
  } catch (error) {
    console.error("Ошибка при отправке в API:", error);
    
    // При исключении воспроизводим аудио локально
    // playRecording(audioBlob);
  }
}

// Функция для отправки аудио в ElevenLabs API
async function sendToElevenLabsAPI(audioBlob) {
  try {
    // Убедимся, что у нас есть запись и API ключ
    if (!audioBlob || audioBlob.size === 0) {
      console.error("Пустая запись, нечего отправлять в API");
      return;
    }
    
    if (!settings.apiKey) {
      console.warn("ElevenLabs API key not provided");
      displayRecognizedText(i18n.getTranslation('missing_api_key'));
      return;
    }
    
    console.log("Отправка аудио в ElevenLabs API для распознавания речи...");
    
    // Создаем FormData и добавляем параметры
    const formData = createFormDataWithParams(audioBlob);
    
    // Отправляем запрос
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: 'POST',
      headers: { 'xi-api-key': settings.apiKey },
      body: formData
    });
    
    if (response.ok) {
      await handleSuccessResponse(response);
    } else {
      await handleErrorResponse(response);
    }
  } catch (error) {
    console.error("Ошибка при отправке в API:", error);
  }
}

// Создание FormData с параметрами
function createFormDataWithParams(audioBlob) {
  const formData = new FormData();
  
  // Обязательные параметры
  formData.append('model_id', 'scribe_v1');
  formData.append('file', audioBlob, `recording.${getFileExtension(audioBlob.type)}`);
  
  // Дополнительные параметры из настроек
  formData.append('tag_audio_events', settings.tagAudioEvents);
  
  if (settings.languageCode) {
    formData.append('language_code', settings.languageCode);
  }

  if (settings.timestampsGranularity && settings.timestampsGranularity !== 'none') {
    formData.append('timestamps_granularity', settings.timestampsGranularity);
  }

  if (settings.diarize === 'true') {
    formData.append('diarize', true);
  }

  if (settings.numSpeakers) {
    formData.append('num_speakers', parseInt(settings.numSpeakers));
  }

  if (settings.biasedKeywords && settings.biasedKeywords.length > 0) {
    formData.append('biased_keywords', JSON.stringify(settings.biasedKeywords));
  }
  
  return formData;
}

// Обработка успешного ответа
async function handleSuccessResponse(response) {
  const result = await response.json();
  console.log("Распознавание успешно:", result);
  displayRecognizedText(result.text || "Текст не распознан");
}

// Обработка ошибки API
async function handleErrorResponse(response) {
  try {
    const errorText = await response.text();
    console.error("Ошибка распознавания:", response.status, errorText);
    
    try {
      const errorJson = JSON.parse(errorText);
      let errorMessage = extractErrorMessage(errorJson);
      
      if (errorMessage) {
        console.log("Извлечено сообщение об ошибке:", errorMessage);
        displayRecognizedText(errorMessage);
      } else {
        displayRecognizedText("Ошибка API: " + JSON.stringify(errorJson));
      }
    } catch (jsonError) {
      console.log("Не удалось разобрать ответ как JSON:", jsonError);
      displayRecognizedText("Ошибка API: " + errorText);
    }
  } catch (textError) {
    console.error("Не удалось получить текст ошибки:", textError);
    displayRecognizedText("Ошибка API: " + response.status);
  }
}

// Функция для извлечения сообщения об ошибке из JSON
function extractErrorMessage(errorJson) {
  if (errorJson.detail && errorJson.detail.message) {
    return errorJson.detail.message;
  } 
  if (errorJson.message) {
    return errorJson.message;
  }
  if (errorJson.error && errorJson.error.message) {
    return errorJson.error.message;
  }
  if (errorJson.errors && errorJson.errors.length > 0) {
    return errorJson.errors[0].message || JSON.stringify(errorJson.errors);
  }
  return null;
}

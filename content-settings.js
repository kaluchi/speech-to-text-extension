// Настройки по умолчанию
let settings = {
  apiKey: '',
  interfaceLanguage: '', // Язык интерфейса, добавлено для синхронизации
  languageCode: 'ru',
  tagAudioEvents: 'false',
  timestampsGranularity: 'none',
  diarize: 'false',
  numSpeakers: null,
  biasedKeywords: [],
  debugAudio: 'false',
  showRecordingMask: 'true'
};

// Загружаем настройки из хранилища при запуске
function loadSettings() {
  try {
    chrome.storage.sync.get({
      apiKey: '',
      interfaceLanguage: '', // Добавлен язык интерфейса
      languageCode: 'ru',
      tagAudioEvents: 'false',
      timestampsGranularity: 'none',
      diarize: 'false',
      numSpeakers: null,
      biasedKeywords: [],
      debugAudio: 'false',
      showRecordingMask: 'true'
    }, (items) => {
      settings = items;
      
      // Устанавливаем язык интерфейса, если он задан
      if (window.i18n && settings.interfaceLanguage) {
        window.i18n.setLanguage(settings.interfaceLanguage);
      }
      
      console.log("Настройки загружены:", JSON.stringify({
        apiKeyLength: settings.apiKey ? settings.apiKey.length : 0,
        interfaceLanguage: settings.interfaceLanguage, // Логируем язык интерфейса
        languageCode: settings.languageCode,
        tagAudioEvents: settings.tagAudioEvents,
        timestampsGranularity: settings.timestampsGranularity,
        diarize: settings.diarize,
        numSpeakers: settings.numSpeakers,
        biasedKeywords: settings.biasedKeywords,
        debugAudio: settings.debugAudio,
        showRecordingMask: settings.showRecordingMask
      }));
    });
  } catch (error) {
    console.error("Ошибка при загрузке настроек:", error);
  }
}

// Загружаем настройки при инициализации
loadSettings();

// Слушаем изменения настроек
try {
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        // Обрабатываем изменения всех настроек одним циклом
        const updatedSettings = {};
        
        for (const [key, { newValue }] of Object.entries(changes)) {
          if (settings.hasOwnProperty(key)) {
            settings[key] = newValue;
            updatedSettings[key] = key === 'apiKey' ? (newValue ? newValue.length : 0) : newValue;
          }
        }
        
        // Применяем изменение языка интерфейса, если он обновился
        if (changes.interfaceLanguage && window.i18n) {
          window.i18n.setLanguage(settings.interfaceLanguage);
        }
        
        // Логируем обновленные настройки
        if (Object.keys(updatedSettings).length > 0) {
          console.log("Настройки обновлены:", JSON.stringify(updatedSettings));
        }
      }
    });
    console.log("Слушатель изменений настроек успешно установлен");
  } else {
    console.warn("chrome.storage.onChanged API недоступен");
  }
} catch (error) {
  console.error("Ошибка при установке слушателя изменений настроек:", error);
}

// Функция для проверки API ключа
async function checkApiKey() {
  try {
    // Получаем API ключ из настроек
    const { apiKey } = await new Promise((resolve) => {
      chrome.storage.sync.get({ apiKey: '' }, resolve);
    });

    // Если ключ пустой или некорректный
    if (!apiKey || !apiKey.startsWith('sk_') || apiKey.length < 32) {
      console.log('API ключ отсутствует или некорректен, открываем настройки');
      
      // Отправляем сообщение фоновой странице для открытия настроек
      chrome.runtime.sendMessage({ command: 'openOptionsPage' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Ошибка при отправке сообщения:', chrome.runtime.lastError);
        } else if (response && response.success) {
          console.log('Страница настроек открыта');
        }
      });
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при проверке API ключа:', error);
    return false;
  }
}

// Дефолтные настройки
const DEFAULT_SETTINGS = {
  apiKey: '',
  languageCode: 'ru',
  tagAudioEvents: 'false',
  timestampsGranularity: 'word',
  diarize: 'false',
  numSpeakers: '',
  biasedKeywords: [],
  debugAudio: 'false',
  preferredMicrophoneId: '',
  showRecordingMask: 'true'
};

// DOM элементы
const apiKeyInput = document.getElementById('api-key');
const languageCodeSelect = document.getElementById('language-code');
const tagAudioEventsSelect = document.getElementById('tag-audio-events');
const timestampsGranularitySelect = document.getElementById('timestamps-granularity');
const diarizeSelect = document.getElementById('diarize');
const numSpeakersInput = document.getElementById('num-speakers');
const debugAudioSelect = document.getElementById('debug-audio');
const showRecordingMaskSelect = document.getElementById('show-recording-mask');
const keywordsContainer = document.getElementById('keywords-container');
const addKeywordButton = document.getElementById('add-keyword');
const resetButton = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');
const toggleVisibilityButton = document.getElementById('toggle-visibility');
const preferredMicrophoneSelect = document.getElementById('preferred-microphone');

// Текущие настройки
let currentSettings = {...DEFAULT_SETTINGS};

// Функция для валидации API ключа
async function validateApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  // Сбрасываем стили
  apiKeyInput.style.border = '1px solid #ddd';
  apiKeyInput.style.backgroundColor = '';
  
  if (!apiKey) {
    showInvalidApiKey('API ключ не может быть пустым');
    return false;
  }
  
  if (!apiKey.startsWith('sk_')) {
    showInvalidApiKey('API ключ должен начинаться с "sk_"');
    return false;
  }
  
  // Здесь можно добавить дополнительные проверки формата ключа
  if (apiKey.length < 32) {
    showInvalidApiKey('API ключ слишком короткий');
    return false;
  }
  
  return true;
}

// Функция для отображения ошибки API ключа
function showInvalidApiKey(message) {
  // Сначала показываем поле, если оно скрыто
  if (apiKeyInput.type === 'password') {
    toggleApiKeyVisibility();
  }
  
  // Устанавливаем стили с небольшой задержкой
  setTimeout(() => {
    apiKeyInput.style.border = '2px solid #f44336';
    apiKeyInput.style.backgroundColor = '#fff8f8';
    showStatus(message, 'error');
    
    // Фокусируемся на поле и выделяем текст
    apiKeyInput.focus();
    apiKeyInput.select();
    
    // Добавляем эффект встряхивания
    apiKeyInput.classList.add('shake');
    setTimeout(() => {
      apiKeyInput.classList.remove('shake');
    }, 500);
  }, 100); // Небольшая задержка для лучшего UX
}

// Добавляем стили для анимации встряхивания
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-10px); }
    75% { transform: translateX(10px); }
  }
  .shake {
    animation: shake 0.5s ease-in-out;
  }
`;
document.head.appendChild(style);

// Функция для создания элемента ключевого слова
function createKeywordElement(keyword = '', bias = 0) {
  const keywordItem = document.createElement('div');
  keywordItem.className = 'keyword-item';

  const wordInput = document.createElement('input');
  wordInput.type = 'text';
  wordInput.placeholder = 'Ключевое слово';
  wordInput.value = keyword;
  wordInput.maxLength = 50;

  const biasInput = document.createElement('input');
  biasInput.type = 'number';
  biasInput.min = -10;
  biasInput.max = 10;
  biasInput.step = 0.1;
  biasInput.placeholder = 'Вес';
  biasInput.value = bias;

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-keyword';
  removeButton.textContent = 'Удалить';
  removeButton.onclick = () => {
    keywordItem.remove();
    saveSettings();
  };

  keywordItem.appendChild(wordInput);
  keywordItem.appendChild(biasInput);
  keywordItem.appendChild(removeButton);

  // Добавляем обработчики для автосохранения
  wordInput.addEventListener('input', saveSettings);
  biasInput.addEventListener('input', saveSettings);

  return keywordItem;
}

// Функция для загрузки настроек из хранилища
async function loadSettings() {
  try {
    chrome.storage.sync.get(DEFAULT_SETTINGS, async (items) => {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при загрузке настроек:", chrome.runtime.lastError);
        showStatus('Ошибка при загрузке настроек!', 'error');
        return;
      }
      
      // Сохраняем текущие настройки
      currentSettings = {
        apiKey: items.apiKey || DEFAULT_SETTINGS.apiKey,
        languageCode: items.languageCode || DEFAULT_SETTINGS.languageCode,
        tagAudioEvents: items.tagAudioEvents || DEFAULT_SETTINGS.tagAudioEvents,
        timestampsGranularity: items.timestampsGranularity || DEFAULT_SETTINGS.timestampsGranularity,
        diarize: items.diarize || DEFAULT_SETTINGS.diarize,
        numSpeakers: items.numSpeakers || DEFAULT_SETTINGS.numSpeakers,
        biasedKeywords: items.biasedKeywords || DEFAULT_SETTINGS.biasedKeywords,
        debugAudio: items.debugAudio || DEFAULT_SETTINGS.debugAudio,
        preferredMicrophoneId: items.preferredMicrophoneId || DEFAULT_SETTINGS.preferredMicrophoneId,
        showRecordingMask: items.showRecordingMask || DEFAULT_SETTINGS.showRecordingMask
      };
      
      // Заполняем поля формы
      apiKeyInput.value = currentSettings.apiKey;
      languageCodeSelect.value = currentSettings.languageCode;
      tagAudioEventsSelect.value = currentSettings.tagAudioEvents;
      timestampsGranularitySelect.value = currentSettings.timestampsGranularity;
      diarizeSelect.value = currentSettings.diarize;
      numSpeakersInput.value = currentSettings.numSpeakers;
      debugAudioSelect.value = currentSettings.debugAudio;
      showRecordingMaskSelect.value = currentSettings.showRecordingMask;

      // Очищаем и заполняем контейнер ключевых слов
      keywordsContainer.innerHTML = '';
      currentSettings.biasedKeywords.forEach(item => {
        const [word, bias] = item.split(':');
        keywordsContainer.appendChild(createKeywordElement(word, parseFloat(bias)));
      });
      
      // Обновляем видимость кнопки сброса
      updateResetButtonVisibility();
      
      // Проверяем API ключ
      if (!currentSettings.apiKey || !currentSettings.apiKey.startsWith('sk_')) {
        showInvalidApiKey('Требуется указать действительный API ключ ElevenLabs');
      }
      
      console.log("Настройки успешно загружены");
    });
  } catch (error) {
    console.error("Исключение при загрузке настроек:", error);
    showStatus('Ошибка при загрузке настроек!', 'error');
  }
}

// Функция для сбора ключевых слов
function collectKeywords() {
  const keywords = [];
  keywordsContainer.querySelectorAll('.keyword-item').forEach(item => {
    const word = item.querySelector('input[type="text"]').value.trim();
    const bias = item.querySelector('input[type="number"]').value;
    if (word && !isNaN(bias)) {
      keywords.push(`${word}:${bias}`);
    }
  });
  return keywords;
}

// Функция для сохранения настроек в хранилище
function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const languageCode = languageCodeSelect.value;
  const tagAudioEvents = tagAudioEventsSelect.value;
  const timestampsGranularity = timestampsGranularitySelect.value;
  const diarize = diarizeSelect.value;
  const numSpeakers = numSpeakersInput.value;
  const debugAudio = debugAudioSelect.value;
  const preferredMicrophoneId = preferredMicrophoneSelect.value;
  const showRecordingMask = showRecordingMaskSelect.value;
  const biasedKeywords = collectKeywords();
  
  // Обновляем текущие настройки
  currentSettings = {
    apiKey,
    languageCode,
    tagAudioEvents,
    timestampsGranularity,
    diarize,
    numSpeakers,
    biasedKeywords,
    debugAudio,
    preferredMicrophoneId,
    showRecordingMask
  };
  
  chrome.storage.sync.set(currentSettings, () => {
    if (chrome.runtime.lastError) {
      console.error("Ошибка при сохранении настроек:", chrome.runtime.lastError);
      showStatus('Ошибка при сохранении настроек!', 'error');
      return;
    }
    
    showStatus('Настройки сохранены!', 'success');
    
    // Обновляем видимость кнопки сброса
    updateResetButtonVisibility();
  });
}

// Функция для сброса настроек к значениям по умолчанию
function resetSettings() {
  apiKeyInput.value = DEFAULT_SETTINGS.apiKey;
  languageCodeSelect.value = DEFAULT_SETTINGS.languageCode;
  tagAudioEventsSelect.value = DEFAULT_SETTINGS.tagAudioEvents;
  timestampsGranularitySelect.value = DEFAULT_SETTINGS.timestampsGranularity;
  diarizeSelect.value = DEFAULT_SETTINGS.diarize;
  numSpeakersInput.value = DEFAULT_SETTINGS.numSpeakers;
  debugAudioSelect.value = DEFAULT_SETTINGS.debugAudio;
  preferredMicrophoneSelect.value = DEFAULT_SETTINGS.preferredMicrophoneId;
  showRecordingMaskSelect.value = DEFAULT_SETTINGS.showRecordingMask;
  
  // Очищаем ключевые слова
  keywordsContainer.innerHTML = '';
  
  // Вызываем сохранение, чтобы обновить хранилище
  saveSettings();
  
  showStatus('Настройки сброшены к значениям по умолчанию!', 'success');
}

// Функция для отображения статуса
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = type;
  statusElement.classList.add('visible');
  
  setTimeout(() => {
    statusElement.classList.remove('visible');
  }, 3000);
}

// Функция для переключения видимости API ключа
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleVisibilityButton.textContent = 'Скрыть';
    // Устанавливаем фокус после показа поля
    setTimeout(() => {
      apiKeyInput.focus();
      apiKeyInput.select();
    }, 100);
  } else {
    apiKeyInput.type = 'password';
    toggleVisibilityButton.textContent = 'Показать';
  }
}

// Функция для проверки, отличаются ли текущие настройки от дефолтных
function areSettingsDifferent() {
  return (
    apiKeyInput.value.trim() !== DEFAULT_SETTINGS.apiKey.trim() ||
    languageCodeSelect.value.trim().toLowerCase() !== DEFAULT_SETTINGS.languageCode.trim().toLowerCase() ||
    tagAudioEventsSelect.value !== DEFAULT_SETTINGS.tagAudioEvents ||
    timestampsGranularitySelect.value !== DEFAULT_SETTINGS.timestampsGranularity ||
    diarizeSelect.value !== DEFAULT_SETTINGS.diarize ||
    numSpeakersInput.value !== DEFAULT_SETTINGS.numSpeakers ||
    debugAudioSelect.value !== DEFAULT_SETTINGS.debugAudio ||
    currentSettings.biasedKeywords.length !== DEFAULT_SETTINGS.biasedKeywords.length ||
    currentSettings.biasedKeywords.some((item, index) => item !== DEFAULT_SETTINGS.biasedKeywords[index]) ||
    currentSettings.preferredMicrophoneId !== DEFAULT_SETTINGS.preferredMicrophoneId ||
    currentSettings.showRecordingMask !== DEFAULT_SETTINGS.showRecordingMask
  );
}

// Функция для обновления видимости кнопки сброса
function updateResetButtonVisibility() {
  if (areSettingsDifferent()) {
    resetButton.style.display = 'inline-block';
  } else {
    resetButton.style.display = 'none';
  }
}

// Функция для автоматического сохранения при изменении настроек
function setupAutoSave() {
  // Для каждого элемента управления добавляем обработчик события изменения
  apiKeyInput.addEventListener('input', async () => {
    // Сбрасываем стили при начале ввода
    apiKeyInput.style.border = '1px solid #ddd';
    apiKeyInput.style.backgroundColor = '';
    
    // Валидация API ключа
    const isValid = await validateApiKey();
    
    // Если ключ валидный, сохраняем настройки
    if (isValid) {
      saveSettings();
    }
  });
  
  // Для селектов
  languageCodeSelect.addEventListener('change', saveSettings);
  tagAudioEventsSelect.addEventListener('change', saveSettings);
  timestampsGranularitySelect.addEventListener('change', saveSettings);
  diarizeSelect.addEventListener('change', saveSettings);
  numSpeakersInput.addEventListener('change', saveSettings);
  debugAudioSelect.addEventListener('change', saveSettings);
  preferredMicrophoneSelect.addEventListener('change', saveSettings);
  showRecordingMaskSelect.addEventListener('change', saveSettings);
}

// Добавляем обработчик для кнопки добавления ключевого слова
addKeywordButton.addEventListener('click', () => {
  if (keywordsContainer.children.length < 100) {
    keywordsContainer.appendChild(createKeywordElement());
  } else {
    showStatus('Достигнут максимум ключевых слов (100)!', 'error');
  }
});

// Добавляем валидацию для поля количества говорящих
numSpeakersInput.addEventListener('input', () => {
  const value = parseInt(numSpeakersInput.value);
  if (value < 1) numSpeakersInput.value = 1;
  if (value > 32) numSpeakersInput.value = 32;
});

// Функция для обновления списка микрофонов
async function updateMicrophoneList() {
  try {
    console.log("Запрашиваем список устройств...");
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    
    // Сохраняем текущее значение
    const currentValue = currentSettings.preferredMicrophoneId;
    
    // Очищаем список, оставляя только опцию "Не задано"
    preferredMicrophoneSelect.innerHTML = '<option value="">Не задано</option>';
    
    // Добавляем найденные микрофоны
    audioInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Микрофон ${device.deviceId.slice(0, 8)}...`;
      preferredMicrophoneSelect.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение, если оно существует в новом списке
    if (currentValue && [...preferredMicrophoneSelect.options].some(opt => opt.value === currentValue)) {
      preferredMicrophoneSelect.value = currentValue;
    }
    
    console.log(`Найдено ${audioInputs.length} микрофонов`);
  } catch (error) {
    console.error("Ошибка при получении списка микрофонов:", error);
    showStatus('Ошибка при получении списка микрофонов', 'error');
  }
}

// Запрашиваем разрешение на доступ к микрофону при открытии настроек
async function requestMicrophonePermission() {
  try {
    console.log("Запрашиваем разрешение на доступ к микрофону...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    // После получения разрешения обновляем список микрофонов
    await updateMicrophoneList();
  } catch (error) {
    console.error("Ошибка при запросе доступа к микрофону:", error);
    showStatus('Требуется разрешение на доступ к микрофону', 'error');
  }
}

// Добавляем слушатель изменений устройств
navigator.mediaDevices.addEventListener('devicechange', updateMicrophoneList);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  setupAutoSave();
  await requestMicrophonePermission();
  await validateApiKey();
});

resetButton.addEventListener('click', resetSettings);
toggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);
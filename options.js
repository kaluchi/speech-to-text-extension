// Дефолтные настройки
const DEFAULT_SETTINGS = {
  apiKey: 'sk_58679ae6974e4b0f24f6a3d7e116d7159af6d56f4c16102a',
  languageCode: 'ru',
  tagAudioEvents: 'false',
  timestampsGranularity: 'word',
  diarize: 'false',
  numSpeakers: '',
  biasedKeywords: [],
  debugAudio: 'false'
};

// DOM элементы
const apiKeyInput = document.getElementById('api-key');
const languageCodeSelect = document.getElementById('language-code');
const tagAudioEventsSelect = document.getElementById('tag-audio-events');
const timestampsGranularitySelect = document.getElementById('timestamps-granularity');
const diarizeSelect = document.getElementById('diarize');
const numSpeakersInput = document.getElementById('num-speakers');
const debugAudioSelect = document.getElementById('debug-audio');
const keywordsContainer = document.getElementById('keywords-container');
const addKeywordButton = document.getElementById('add-keyword');
const resetButton = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');
const toggleVisibilityButton = document.getElementById('toggle-visibility');

// Текущие настройки
let currentSettings = {...DEFAULT_SETTINGS};

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
function loadSettings() {
  try {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при загрузке настроек:", chrome.runtime.lastError);
        showStatus('Ошибка при загрузке настроек!', 'error');
        return;
      }
      
      // Сохраняем текущие настройки
      currentSettings = {
        apiKey: items.apiKey || 'sk_58679ae6974e4b0f24f6a3d7e116d7159af6d56f4c16102a',
        languageCode: items.languageCode || 'ru',
        tagAudioEvents: items.tagAudioEvents || 'false',
        timestampsGranularity: items.timestampsGranularity || 'word',
        diarize: items.diarize || 'false',
        numSpeakers: items.numSpeakers || '',
        biasedKeywords: items.biasedKeywords || [],
        debugAudio: items.debugAudio || 'false'
      };
      
      // Заполняем поля формы
      apiKeyInput.value = currentSettings.apiKey;
      languageCodeSelect.value = currentSettings.languageCode;
      tagAudioEventsSelect.value = currentSettings.tagAudioEvents;
      timestampsGranularitySelect.value = currentSettings.timestampsGranularity;
      diarizeSelect.value = currentSettings.diarize;
      numSpeakersInput.value = currentSettings.numSpeakers;
      debugAudioSelect.value = currentSettings.debugAudio;

      // Очищаем и заполняем контейнер ключевых слов
      keywordsContainer.innerHTML = '';
      currentSettings.biasedKeywords.forEach(item => {
        const [word, bias] = item.split(':');
        keywordsContainer.appendChild(createKeywordElement(word, parseFloat(bias)));
      });
      
      // Обновляем видимость кнопки сброса
      updateResetButtonVisibility();
      
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
    debugAudio
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
    currentSettings.biasedKeywords.some((item, index) => item !== DEFAULT_SETTINGS.biasedKeywords[index])
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
  apiKeyInput.addEventListener('input', () => {
    // Валидация API ключа (простая проверка формата)
    const value = apiKeyInput.value.trim();
    if (value && !value.startsWith('sk_')) {
      apiKeyInput.setCustomValidity('API ключ ElevenLabs должен начинаться с "sk_"');
    } else {
      apiKeyInput.setCustomValidity('');
    }
    
    // Если ключ валидный, сохраняем настройки
    if (apiKeyInput.validity.valid) {
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

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupAutoSave();
});

resetButton.addEventListener('click', resetSettings);
toggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);
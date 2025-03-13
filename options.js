// Дефолтные настройки
const DEFAULT_SETTINGS = {
  apiKey: 'sk_58679ae6974e4b0f24f6a3d7e116d7159af6d56f4c16102a',
  languageCode: 'ru',
  tagAudioEvents: 'false'
};

// DOM элементы
const apiKeyInput = document.getElementById('api-key');
const languageCodeSelect = document.getElementById('language-code');
const tagAudioEventsSelect = document.getElementById('tag-audio-events');
const saveButton = document.getElementById('save-btn');
const resetButton = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');
const toggleVisibilityButton = document.getElementById('toggle-visibility');

// Функция для загрузки настроек из хранилища
function loadSettings() {
  try {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при загрузке настроек:", chrome.runtime.lastError);
        showStatus('Ошибка при загрузке настроек! Проверьте консоль для деталей.', 'error');
        return;
      }
      
      apiKeyInput.value = items.apiKey || '';
      languageCodeSelect.value = items.languageCode || 'ru';
      tagAudioEventsSelect.value = items.tagAudioEvents || 'false';
      
      console.log("Настройки успешно загружены");
    });
  } catch (error) {
    console.error("Исключение при загрузке настроек:", error);
    showStatus('Ошибка при загрузке настроек!', 'error');
  }
}

// Функция для сохранения настроек в хранилище
function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const languageCode = languageCodeSelect.value;
  const tagAudioEvents = tagAudioEventsSelect.value;
  
  chrome.storage.sync.set({
    apiKey: apiKey,
    languageCode: languageCode,
    tagAudioEvents: tagAudioEvents
  }, () => {
    showStatus('Настройки сохранены!', 'success');
  });
}

// Функция для сброса настроек к значениям по умолчанию
function resetSettings() {
  apiKeyInput.value = DEFAULT_SETTINGS.apiKey;
  languageCodeSelect.value = DEFAULT_SETTINGS.languageCode;
  tagAudioEventsSelect.value = DEFAULT_SETTINGS.tagAudioEvents;
  
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

// Обработчики событий
document.addEventListener('DOMContentLoaded', loadSettings);
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetSettings);
toggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);

// Валидация API ключа (простая проверка формата)
apiKeyInput.addEventListener('input', () => {
  const value = apiKeyInput.value.trim();
  if (value && !value.startsWith('sk_')) {
    apiKeyInput.setCustomValidity('API ключ ElevenLabs должен начинаться с "sk_"');
  } else {
    apiKeyInput.setCustomValidity('');
  }
});
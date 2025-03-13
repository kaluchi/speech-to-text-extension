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
const resetButton = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');
const toggleVisibilityButton = document.getElementById('toggle-visibility');

// Текущие настройки
let currentSettings = {...DEFAULT_SETTINGS};

// Функция для загрузки настроек из хранилища
function loadSettings() {
  try {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при загрузке настроек:", chrome.runtime.lastError);
        showStatus('Ошибка при загрузке настроек! Проверьте консоль для деталей.', 'error');
        return;
      }
      
      // Сохраняем текущие настройки
      currentSettings = {
        apiKey: items.apiKey || '',
        languageCode: items.languageCode || 'ru',
        tagAudioEvents: items.tagAudioEvents || 'false'
      };
      
      // Заполняем поля формы
      apiKeyInput.value = currentSettings.apiKey;
      languageCodeSelect.value = currentSettings.languageCode;
      tagAudioEventsSelect.value = currentSettings.tagAudioEvents;
      
      // Обновляем видимость кнопки сброса
      updateResetButtonVisibility();
      
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
  
  // Обновляем текущие настройки
  currentSettings = {
    apiKey,
    languageCode,
    tagAudioEvents
  };
  
  chrome.storage.sync.set({
    apiKey,
    languageCode,
    tagAudioEvents
  }, () => {
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
    apiKeyInput.value !== DEFAULT_SETTINGS.apiKey ||
    languageCodeSelect.value !== DEFAULT_SETTINGS.languageCode ||
    tagAudioEventsSelect.value !== DEFAULT_SETTINGS.tagAudioEvents
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
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupAutoSave();
});

resetButton.addEventListener('click', resetSettings);
toggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);
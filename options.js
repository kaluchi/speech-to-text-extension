// Default settings
const DEFAULT_SETTINGS = {
  apiKey: '',
  interfaceLanguage: '', // Default to browser language
  languageCode: 'ru',
  tagAudioEvents: false,  // Булево вместо строки
  timestampsGranularity: 'word',
  diarize: false,         // Булево вместо строки
  numSpeakers: 1,          // Число вместо строки
  biasedKeywords: [],
  debugAudio: false,      // Булево вместо строки
  preferredMicrophoneId: '',
  enableRecordingMask: true  // Булево вместо строки
};

// DOM elements
const apiKeyInput = document.getElementById('api-key');
const interfaceLanguageSelect = document.getElementById('interface-language');
const languageCodeSelect = document.getElementById('language-code');
const tagAudioEventsSelect = document.getElementById('tag-audio-events');
const timestampsGranularitySelect = document.getElementById('timestamps-granularity');
const diarizeSelect = document.getElementById('diarize');
const numSpeakersInput = document.getElementById('num-speakers');
const debugAudioSelect = document.getElementById('debug-audio');
const enableRecordingMaskSelect = document.getElementById('enable-recording-mask');
const keywordsContainer = document.getElementById('keywords-container');
const addKeywordButton = document.getElementById('add-keyword');
const resetButton = document.getElementById('reset-btn');
const statusElement = document.getElementById('status');
const toggleVisibilityButton = document.getElementById('toggle-visibility');
const preferredMicrophoneSelect = document.getElementById('preferred-microphone');

// Current settings
let currentSettings = {...DEFAULT_SETTINGS};

// Function to validate API key
async function validateApiKey() {
  const apiKey = apiKeyInput.value.trim();
  
  // Reset styles
  apiKeyInput.style.border = '1px solid #ddd';
  apiKeyInput.style.backgroundColor = '';
  
  if (!apiKey) {
    showInvalidApiKey(i18n.getTranslation('api_key_empty'));
    return false;
  }
  
  if (!apiKey.startsWith('sk_')) {
    showInvalidApiKey(i18n.getTranslation('invalid_api_key_format'));
    return false;
  }
  
  // Additional key format checks
  if (apiKey.length < 32) {
    showInvalidApiKey(i18n.getTranslation('api_key_length_error'));
    return false;
  }
  
  return true;
}

// Function to display API key error
function showInvalidApiKey(message) {
  // Show the field if it's hidden
  if (apiKeyInput.type === 'password') {
    toggleApiKeyVisibility();
  }
  
  // Set styles with a slight delay
  setTimeout(() => {
    apiKeyInput.style.border = '2px solid #f44336';
    apiKeyInput.style.backgroundColor = '#fff8f8';
    showStatus(message, 'error');
    
    // Focus on the field and select text
    apiKeyInput.focus();
    apiKeyInput.select();
    
    // Add shake effect
    apiKeyInput.classList.add('shake');
    setTimeout(() => {
      apiKeyInput.classList.remove('shake');
    }, 500);
  }, 100); // Small delay for better UX
}

// Add styles for shake animation
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

// Function to create keyword element
function createKeywordElement(keyword = '', bias = 0) {
  const keywordItem = document.createElement('div');
  keywordItem.className = 'keyword-item';

  const wordInput = document.createElement('input');
  wordInput.type = 'text';
  wordInput.placeholder = i18n.getTranslation('keyword_placeholder');
  wordInput.value = keyword;
  wordInput.maxLength = 50;

  const biasInput = document.createElement('input');
  biasInput.type = 'number';
  biasInput.min = -10;
  biasInput.max = 10;
  biasInput.step = 0.1;
  biasInput.placeholder = i18n.getTranslation('weight_placeholder');
  biasInput.value = bias;

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-keyword';
  removeButton.textContent = i18n.getTranslation('remove');
  removeButton.onclick = () => {
    keywordItem.remove();
    saveSettings();
  };

  keywordItem.appendChild(wordInput);
  keywordItem.appendChild(biasInput);
  keywordItem.appendChild(removeButton);

  // Add handlers for auto-save
  wordInput.addEventListener('input', saveSettings);
  biasInput.addEventListener('input', saveSettings);

  return keywordItem;
}

// Function to load settings from storage
async function loadSettings() {
  try {
    chrome.storage.sync.get(DEFAULT_SETTINGS, async (items) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading settings:", chrome.runtime.lastError);
        showStatus(i18n.getTranslation('settings_load_error'), 'error');
        return;
      }
      
      // Save current settings
      currentSettings = {
        apiKey: items.apiKey || DEFAULT_SETTINGS.apiKey,
        interfaceLanguage: items.interfaceLanguage || DEFAULT_SETTINGS.interfaceLanguage,
        languageCode: items.languageCode || DEFAULT_SETTINGS.languageCode,
        tagAudioEvents: items.tagAudioEvents || DEFAULT_SETTINGS.tagAudioEvents,
        timestampsGranularity: items.timestampsGranularity || DEFAULT_SETTINGS.timestampsGranularity,
        diarize: items.diarize || DEFAULT_SETTINGS.diarize,
        numSpeakers: items.numSpeakers || DEFAULT_SETTINGS.numSpeakers,
        biasedKeywords: items.biasedKeywords || DEFAULT_SETTINGS.biasedKeywords,
        debugAudio: items.debugAudio || DEFAULT_SETTINGS.debugAudio,
        preferredMicrophoneId: items.preferredMicrophoneId || DEFAULT_SETTINGS.preferredMicrophoneId,
        enableRecordingMask: items.enableRecordingMask || DEFAULT_SETTINGS.enableRecordingMask
      };
      
      // Fill form fields
      apiKeyInput.value = currentSettings.apiKey;
      
      // Set interface language if it exists
      if (currentSettings.interfaceLanguage) {
        i18n.setLanguage(currentSettings.interfaceLanguage);
      }
      
      // Populate interface language dropdown
      populateInterfaceLanguageDropdown();
      
      languageCodeSelect.value = currentSettings.languageCode;
      tagAudioEventsSelect.value = currentSettings.tagAudioEvents;
      timestampsGranularitySelect.value = currentSettings.timestampsGranularity;
      diarizeSelect.value = currentSettings.diarize;
      numSpeakersInput.value = currentSettings.numSpeakers;
      debugAudioSelect.value = currentSettings.debugAudio;
      enableRecordingMaskSelect.value = currentSettings.enableRecordingMask;

      // Clear and fill keywords container
      keywordsContainer.innerHTML = '';
      currentSettings.biasedKeywords.forEach(item => {
        const [word, bias] = item.split(':');
        keywordsContainer.appendChild(createKeywordElement(word, parseFloat(bias)));
      });
      
      // Apply translations to all elements
      i18n.applyTranslations();
      
      // Update reset button visibility
      updateResetButtonVisibility();
      
      // Check API key
      if (!currentSettings.apiKey || !currentSettings.apiKey.startsWith('sk_')) {
        showInvalidApiKey(i18n.getTranslation('api_key_required'));
      }
      
      console.log("Settings loaded successfully");
    });
  } catch (error) {
    console.error("Exception loading settings:", error);
    showStatus(i18n.getTranslation('settings_load_error'), 'error');
  }
}

// Function to populate interface language dropdown
function populateInterfaceLanguageDropdown() {
  if (!interfaceLanguageSelect) return;
  
  // Clear existing options
  interfaceLanguageSelect.innerHTML = '';
  
  // Add options for each available language
  Object.entries(i18n.AVAILABLE_LANGUAGES).forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = name;
    interfaceLanguageSelect.appendChild(option);
  });
  
  // Set current language as selected
  interfaceLanguageSelect.value = i18n.getCurrentLanguage();
}

// Function to collect keywords
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

// Function to save settings to storage
function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const interfaceLanguage = interfaceLanguageSelect.value;
  const languageCode = languageCodeSelect.value;
  
  // Преобразование строковых значений 'в нативные типы данных
  const tagAudioEvents = tagAudioEventsSelect.value === 'true';
  const timestampsGranularity = timestampsGranularitySelect.value;
  const diarize = diarizeSelect.value === 'true';
  
  // Парсим и валидируем нумерованные значения
  let numSpeakers = parseInt(numSpeakersInput.value, 10);
  if (isNaN(numSpeakers) || numSpeakers < 1) numSpeakers = 1;
  if (numSpeakers > 32) numSpeakers = 32;
  
  const debugAudio = debugAudioSelect.value === 'true';
  const preferredMicrophoneId = preferredMicrophoneSelect.value;
  const enableRecordingMask = enableRecordingMaskSelect.value === 'true';
  const biasedKeywords = collectKeywords();
  
  // Update current settings with proper types
  currentSettings = {
    apiKey,
    interfaceLanguage,
    languageCode,
    tagAudioEvents,
    timestampsGranularity,
    diarize,
    numSpeakers,
    biasedKeywords,
    debugAudio,
    preferredMicrophoneId,
    enableRecordingMask
  };
  
  chrome.storage.sync.set(currentSettings, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving settings:", chrome.runtime.lastError);
      showStatus(i18n.getTranslation('settings_save_error'), 'error');
      return;
    }
    
    showStatus(i18n.getTranslation('settings_saved'), 'success');
    
    // Update reset button visibility
    updateResetButtonVisibility();
  });
}

// Function to reset settings to defaults
function resetSettings() {
  apiKeyInput.value = DEFAULT_SETTINGS.apiKey;
  // Don't reset interface language - let the user keep their language choice
  languageCodeSelect.value = DEFAULT_SETTINGS.languageCode;
  tagAudioEventsSelect.value = DEFAULT_SETTINGS.tagAudioEvents;
  timestampsGranularitySelect.value = DEFAULT_SETTINGS.timestampsGranularity;
  diarizeSelect.value = DEFAULT_SETTINGS.diarize;
  numSpeakersInput.value = DEFAULT_SETTINGS.numSpeakers;
  debugAudioSelect.value = DEFAULT_SETTINGS.debugAudio;
  preferredMicrophoneSelect.value = DEFAULT_SETTINGS.preferredMicrophoneId;
  enableRecordingMaskSelect.value = DEFAULT_SETTINGS.enableRecordingMask;
  
  // Clear keywords
  keywordsContainer.innerHTML = '';
  
  // Call save to update storage
  saveSettings();
  
  showStatus(i18n.getTranslation('settings_reset'), 'success');
}

// Function to display status
function showStatus(message, type) {
  statusElement.textContent = message;
  statusElement.className = type;
  statusElement.classList.add('visible');
  
  setTimeout(() => {
    statusElement.classList.remove('visible');
  }, 3000);
}

// Function to toggle API key visibility
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleVisibilityButton.textContent = i18n.getTranslation('hide_key');
    // Set focus after showing the field
    setTimeout(() => {
      apiKeyInput.focus();
      apiKeyInput.select();
    }, 100);
  } else {
    apiKeyInput.type = 'password';
    toggleVisibilityButton.textContent = i18n.getTranslation('show_key');
  }
}

// Function to check if current settings differ from defaults
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
    currentSettings.enableRecordingMask !== DEFAULT_SETTINGS.enableRecordingMask
  );
}

// Function to update reset button visibility
function updateResetButtonVisibility() {
  if (areSettingsDifferent()) {
    resetButton.style.display = 'inline-block';
  } else {
    resetButton.style.display = 'none';
  }
}

// Function to set up auto-save for settings changes
function setupAutoSave() {
  // Add input handler for API key
  apiKeyInput.addEventListener('input', async () => {
    // Reset styles when typing starts
    apiKeyInput.style.border = '1px solid #ddd';
    apiKeyInput.style.backgroundColor = '';
    
    // Validate API key
    const isValid = await validateApiKey();
    
    // If key is valid, save settings
    if (isValid) {
      saveSettings();
    }
  });
  
  // Interface language change handling
  interfaceLanguageSelect.addEventListener('change', () => {
    const newLang = interfaceLanguageSelect.value;
    if (i18n.setLanguage(newLang)) {
      i18n.applyTranslations();
      
      // Update toggle visibility button text
      if (apiKeyInput.type === 'password') {
        toggleVisibilityButton.textContent = i18n.getTranslation('show_key');
      } else {
        toggleVisibilityButton.textContent = i18n.getTranslation('hide_key');
      }
      
      // Update placeholder texts that aren't handled by applyTranslations
      updateDynamicTranslations();
      
      // Save the setting
      saveSettings();
    }
  });
  
  // For selects
  languageCodeSelect.addEventListener('change', saveSettings);
  tagAudioEventsSelect.addEventListener('change', saveSettings);
  timestampsGranularitySelect.addEventListener('change', saveSettings);
  diarizeSelect.addEventListener('change', saveSettings);
  numSpeakersInput.addEventListener('change', saveSettings);
  debugAudioSelect.addEventListener('change', saveSettings);
  preferredMicrophoneSelect.addEventListener('change', saveSettings);
  enableRecordingMaskSelect.addEventListener('change', saveSettings);
}

// Function to update dynamic translations
function updateDynamicTranslations() {
  // Update keyword placeholders
  keywordsContainer.querySelectorAll('.keyword-item').forEach(item => {
    const wordInput = item.querySelector('input[type="text"]');
    const biasInput = item.querySelector('input[type="number"]');
    const removeButton = item.querySelector('.remove-keyword');
    
    if (wordInput) wordInput.placeholder = i18n.getTranslation('keyword_placeholder');
    if (biasInput) biasInput.placeholder = i18n.getTranslation('weight_placeholder');
    if (removeButton) removeButton.textContent = i18n.getTranslation('remove');
  });
  
  // Update numSpeakersInput placeholder
  if (numSpeakersInput) {
    numSpeakersInput.placeholder = i18n.getTranslation('num_speakers_placeholder');
  }
  
  // Update addKeywordButton
  if (addKeywordButton) {
    addKeywordButton.textContent = i18n.getTranslation('add_keyword');
  }
}

// Add event handler for add keyword button
addKeywordButton.addEventListener('click', () => {
  if (keywordsContainer.children.length < 100) {
    keywordsContainer.appendChild(createKeywordElement());
  } else {
    showStatus(i18n.getTranslation('max_keywords'), 'error');
  }
});

// Add validation for num speakers field
numSpeakersInput.addEventListener('input', () => {
  const value = parseInt(numSpeakersInput.value);
  if (value < 1) numSpeakersInput.value = 1;
  if (value > 32) numSpeakersInput.value = 32;
});

// Function to update microphone list
async function updateMicrophoneList() {
  try {
    console.log("Requesting device list...");
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    
    // Save current value
    const currentValue = currentSettings.preferredMicrophoneId;
    
    // Clear list, leaving only "Not specified" option
    preferredMicrophoneSelect.innerHTML = `<option value="" data-i18n="not_specified">${i18n.getTranslation('not_specified')}</option>`;
    
    // Add found microphones
    audioInputs.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Mic ${device.deviceId.slice(0, 8)}...`;
      preferredMicrophoneSelect.appendChild(option);
    });
    
    // Restore selected value if it exists in the new list
    if (currentValue && [...preferredMicrophoneSelect.options].some(opt => opt.value === currentValue)) {
      preferredMicrophoneSelect.value = currentValue;
    }
    
    console.log(`Found ${audioInputs.length} microphones`);
  } catch (error) {
    console.error("Error getting microphone list:", error);
    showStatus(i18n.getTranslation('mic_list_error'), 'error');
  }
}

// Request microphone permission when opening settings
async function requestMicrophonePermission() {
  try {
    console.log("Requesting microphone permission...");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    // Update microphone list after permission
    await updateMicrophoneList();
  } catch (error) {
    console.error("Error requesting microphone access:", error);
    showStatus(i18n.getTranslation('mic_permission_error'), 'error');
  }
}

// Add device change listener
navigator.mediaDevices.addEventListener('devicechange', updateMicrophoneList);

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  // First initialize i18n
  i18n.loadLanguageSetting(async () => {
    // Then load settings and apply translations
    await loadSettings();
    
    // Setup auto-save functionality
    setupAutoSave();
    
    // Request microphone permission and populate list
    await requestMicrophonePermission();
    
    // Validate API key
    await validateApiKey();
    
    // Update dynamic translations to ensure placeholders are correct
    updateDynamicTranslations();
  });
});

// Event listeners
resetButton.addEventListener('click', resetSettings);
toggleVisibilityButton.addEventListener('click', toggleApiKeyVisibility);

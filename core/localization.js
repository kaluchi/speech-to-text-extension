/**
 * Core Localization Module
 * Provides basic functionality for internationalization and localization
 */

class LocalizationCore {
  constructor() {
    // Available languages
    this._languages = {
      en: "English",
      ru: "Русский"
    };

    // Translation strings for all UI elements
    this._translations = {
      // Extension name and metadata
      "extension_name": {
        en: "Voice Input with ElevenLabs",
        ru: "Голосовой ввод с ElevenLabs"
      },
      "extension_description": {
        en: "Double press Cmd/Ctrl to activate sound recording and convert to text with ElevenLabs API",
        ru: "Двойное нажатие Cmd/Ctrl активирует запись звука и преобразование в текст с ElevenLabs API"
      },
      
      // Popup UI
      "popup_title": {
        en: "Voice Input with ElevenLabs",
        ru: "Голосовой ввод с ElevenLabs"
      },
      "popup_description": {
        en: "This extension allows you to use speech recognition through ElevenLabs API for voice input in any text field on a web page.",
        ru: "Расширение позволяет использовать распознавание речи через ElevenLabs API для голосового ввода текста в любое текстовое поле на веб-странице."
      },
      "instructions_title": {
        en: "How to use:",
        ru: "Инструкция по использованию:"
      },
      "press_key_twice": {
        en: "Press twice quickly and hold",
        ru: "Дважды быстро Нажмите и удерживайте"
      },
      "speak_while_holding": {
        en: "Speak while holding the key",
        ru: "Говорите, пока удерживаете клавишу"
      },
      "release_to_finish": {
        en: "Release the key to finish recording",
        ru: "Отпустите клавишу для завершения записи"
      },
      "text_will_be_inserted": {
        en: "Text will be inserted into the active input field",
        ru: "Текст будет вставлен в активное поле ввода"
      },
      "extension_active": {
        en: "Extension active",
        ru: "Расширение активно"
      },
      "open_settings": {
        en: "Open Settings",
        ru: "Открыть настройки"
      },
      "footer_text": {
        en: "Developed using ElevenLabs speech recognition technology.",
        ru: "Разработано с использованием технологии ElevenLabs для распознавания речи."
      },
      
      // Options page
      "options_title": {
        en: "Voice Input Settings",
        ru: "Настройки голосового ввода"
      },
      "api_key_label": {
        en: "ElevenLabs API Key:",
        ru: "API ключ ElevenLabs:"
      },
      "api_key_placeholder": {
        en: "Enter your ElevenLabs API key",
        ru: "Введите ваш API ключ ElevenLabs"
      },
      "show_key": {
        en: "Show",
        ru: "Показать"
      },
      "hide_key": {
        en: "Hide",
        ru: "Скрыть"
      },
      "api_key_info": {
        en: "You can get an API key by registering at",
        ru: "Вы можете получить API ключ, зарегистрировавшись на"
      },
      "language_label": {
        en: "Interface Language:",
        ru: "Язык интерфейса:"
      },
      "recognition_language_label": {
        en: "Recognition Language:",
        ru: "Язык распознавания:"
      },
      "auto_detect_language": {
        en: "Auto-detect language",
        ru: "Автоопределение языка"
      },
      "tag_audio_events_label": {
        en: "Tag Audio Events:",
        ru: "Маркировка звуковых событий:"
      },
      "enabled": {
        en: "Enabled",
        ru: "Включено"
      },
      "disabled": {
        en: "Disabled",
        ru: "Выключено"
      },
      "tag_audio_events_info": {
        en: "When enabled, pauses, laughter, and other audio events will be marked in the recognized text.",
        ru: "При включении в распознанном тексте будут отмечены паузы, смех и другие звуковые события."
      },
      "timestamps_label": {
        en: "Timestamps Detail:",
        ru: "Детализация временных меток:"
      },
      "none": {
        en: "Disabled",
        ru: "Отключено"
      },
      "word": {
        en: "By word",
        ru: "По словам"
      },
      "character": {
        en: "By character",
        ru: "По символам"
      },
      "timestamps_info": {
        en: "Select the level of timestamp detail in the transcription.",
        ru: "Выберите уровень детализации временных меток в транскрипции."
      },
      "diarize_label": {
        en: "Speaker Diarization:",
        ru: "Разметка говорящих:"
      },
      "diarize_info": {
        en: "Enable to identify who is speaking and when in the recording.",
        ru: "Включите для определения кто и когда говорит в записи."
      },
      "num_speakers_label": {
        en: "Maximum Number of Speakers:",
        ru: "Максимальное количество говорящих:"
      },
      "num_speakers_placeholder": {
        en: "Auto-detect",
        ru: "Автоопределение"
      },
      "num_speakers_info": {
        en: "Specify the maximum number of speakers (1 to 32). Leave empty for auto-detection.",
        ru: "Укажите максимальное количество говорящих (от 1 до 32). Оставьте пустым для автоопределения."
      },
      "keywords_label": {
        en: "Keywords for Improved Recognition:",
        ru: "Ключевые слова для улучшения распознавания:"
      },
      "add_keyword": {
        en: "Add Keyword",
        ru: "Добавить ключевое слово"
      },
      "keywords_info": {
        en: "Add keywords and their weights (-10 to 10) to improve recognition.",
        ru: "Добавьте ключевые слова и их веса (от -10 до 10) для улучшения распознавания."
      },
      "keyword_placeholder": {
        en: "Keyword",
        ru: "Ключевое слово"
      },
      "weight_placeholder": {
        en: "Weight",
        ru: "Вес"
      },
      "remove": {
        en: "Remove",
        ru: "Удалить"
      },
      "preferred_mic_label": {
        en: "Preferred Microphone:",
        ru: "Предпочитаемый микрофон:"
      },
      "not_specified": {
        en: "Not specified",
        ru: "Не задано"
      },
      "preferred_mic_info": {
        en: "Choose a specific microphone to speed up recording initialization. The list will update when settings are opened.",
        ru: "Выберите конкретный микрофон для ускорения запуска записи. Список обновится при открытии настроек."
      },
      "debug_audio_label": {
        en: "Debug Recorded Audio:",
        ru: "Отладка записанного звука:"
      },
      "debug_audio_info": {
        en: "When enabled, the recording will be played back while being sent to the server.",
        ru: "При включении будет воспроизводиться запись параллельно с отправкой на сервер."
      },
      "recording_mask_label": {
        en: "Visual Recording Indicator:",
        ru: "Визуальная индикация записи:"
      },
      "recording_mask_info": {
        en: "When enabled, a color indicator will be displayed during recording (yellow during initialization, green during recording).",
        ru: "При включении во время записи будет отображаться цветовая индикация (жёлтая при инициализации, зелёная при записи)."
      },
      "reset_button": {
        en: "Reset Settings",
        ru: "Сбросить настройки"
      },
      
      // Content script
      "speech_not_detected": {
        en: "Speech not detected. Please speak louder or check your microphone.",
        ru: "Речь не обнаружена. Пожалуйста, говорите громче или проверьте микрофон."
      },
      "missing_api_key": {
        en: "Please provide an ElevenLabs API key in the extension settings",
        ru: "Пожалуйста, укажите API ключ ElevenLabs в настройках расширения"
      },
      "text_copied": {
        en: "Text copied to clipboard",
        ru: "Текст скопирован в буфер обмена"
      },
      "copy_failed": {
        en: "Failed to copy text",
        ru: "Не удалось скопировать текст"
      },
      "recording_info": {
        en: "Format: {0}, Size: {1} KB",
        ru: "Формат: {0}, Размер: {1} КБ"
      },
      "download_recording": {
        en: "Download Recording",
        ru: "Скачать запись"
      },
      "recorded_audio": {
        en: "Recorded Audio",
        ru: "Записанное аудио"
      },
      
      // Error messages
      "mic_access_denied": {
        en: "Microphone access denied",
        ru: "Доступ к микрофону запрещен"
      },
      "mic_not_found": {
        en: "Microphone not found",
        ru: "Микрофон не найден"
      },
      "mic_in_use": {
        en: "Microphone is in use by another application",
        ru: "Микрофон занят другим приложением"
      },
      "technical_limitations": {
        en: "Technical limitations of the microphone",
        ru: "Технические ограничения микрофона"
      },
      "incorrect_data_type": {
        en: "Incorrect data type when requesting microphone",
        ru: "Неверный тип данных при запросе микрофона"
      },
      "unknown_mic_error": {
        en: "Unknown microphone error: {0}",
        ru: "Ошибка микрофона: {0}"
      },
      "unknown_error": {
        en: "Unknown error",
        ru: "Неизвестная ошибка"
      },
      "access_tab_error": {
        en: "Failed to access tab",
        ru: "Не удалось получить доступ к вкладке"
      },
      "tab_not_found": {
        en: "Active tab not found",
        ru: "Не удалось найти активную вкладку"
      },
      "system_page_error": {
        en: "Extension doesn't work on system pages",
        ru: "Расширение не работает на системных страницах"
      },
      "extension_unavailable": {
        en: "Extension unavailable on this page",
        ru: "Расширение недоступно на этой странице"
      },
      "mic_status_check_failed": {
        en: "Failed to check microphone status",
        ru: "Не удалось проверить статус микрофона"
      },
      "settings_access_error": {
        en: "Error accessing settings",
        ru: "Ошибка доступа к настройкам"
      },
      "api_key_required": {
        en: "API key must be specified in settings",
        ru: "Требуется указать API ключ в настройках"
      },
      "invalid_api_key_format": {
        en: "Invalid API key format (must start with sk_)",
        ru: "Неверный формат API ключа (должен начинаться с sk_)"
      },
      "api_key_valid": {
        en: "API key is valid",
        ru: "API ключ валиден"
      },
      "settings_open_error": {
        en: "Failed to open settings page",
        ru: "Не удалось открыть страницу настроек"
      },
      "popup_blocked": {
        en: "Failed to open settings. Popups may be blocked in the browser.",
        ru: "Не удалось открыть страницу настроек. Возможно, в браузере заблокированы всплывающие окна."
      },
      "max_keywords": {
        en: "Maximum keywords reached (100)!",
        ru: "Достигнут максимум ключевых слов (100)!"
      },
      "settings_saved": {
        en: "Settings saved!",
        ru: "Настройки сохранены!"
      },
      "settings_reset": {
        en: "Settings reset to defaults!",
        ru: "Настройки сброшены к значениям по умолчанию!"
      },
      "settings_save_error": {
        en: "Error saving settings!",
        ru: "Ошибка при сохранении настроек!"
      },
      "mic_permission_error": {
        en: "Microphone permission required",
        ru: "Требуется разрешение на доступ к микрофону"
      },
      "api_key_length_error": {
        en: "API key is too short",
        ru: "API ключ слишком короткий"
      },
      "api_key_empty": {
        en: "API key cannot be empty",
        ru: "API ключ не может быть пустым"
      },
      "recognition_language_info": {
        en: "Select the recognition language to improve accuracy.",
        ru: "Выберите язык распознавания для повышения точности."
      },
      "num_speakers_error": {
        en: "Error in settings: number of speakers must be 1 or more",
        ru: "Ошибка в настройках: количество говорящих должно быть 1 или больше"
      },
      "api_validation_error": {
        en: "API validation error: please check the extension settings",
        ru: "Ошибка валидации API: проверьте настройки расширения"
      },
      "speech_recognition_error": {
        en: "Speech recognition error. Please check settings or try again later.",
        ru: "Ошибка распознавания речи. Проверьте настройки или попробуйте позже."
      }
    };

    // Current language (default to browser language or fall back to English)
    this._currentLanguage = (navigator.language || navigator.userLanguage).startsWith('ru') ? 'ru' : 'en';
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key
   * @param {...any} params - Parameters for placeholders
   * @returns {string} - Translated string
   */
  getTranslation(key, ...params) {
    const translation = this._translations[key] ? 
      (this._translations[key][this._currentLanguage] || this._translations[key].en) : 
      key;
    
    // Replace placeholders with params
    if (params && params.length > 0) {
      return translation.replace(/\{(\d+)\}/g, (match, number) => {
        return typeof params[number] !== 'undefined' ? params[number] : match;
      });
    }
    
    return translation;
  }

  /**
   * Set the current language
   * @param {string} lang - Language code
   * @returns {boolean} - Success flag
   */
  setLanguage(lang) {
    if (this._languages[lang]) {
      this._currentLanguage = lang;
      
      // Save to storage
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ 'interfaceLanguage': lang }, function() {
          if (chrome.runtime.lastError) {
            console.error("Error saving language setting:", chrome.runtime.lastError);
          } else {
            console.log("Language setting saved:", lang);
          }
        });
      }
      
      return true;
    }
    return false;
  }

  /**
   * Load language setting from storage
   * @param {Function} callback - Callback function after loading
   * @returns {Promise<string>} - Promise resolving to current language
   */
  async loadLanguageSetting(callback) {
    // Return a promise for async operations
    return new Promise((resolve) => {
      if (!chrome?.storage?.sync) {
        if (callback) callback(this._currentLanguage);
        resolve(this._currentLanguage);
        return;
      }

      chrome.storage.sync.get('interfaceLanguage', (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading language setting:", chrome.runtime.lastError);
          if (callback) callback(this._currentLanguage);
          resolve(this._currentLanguage);
          return;
        }
        
        if (result.interfaceLanguage && this._languages[result.interfaceLanguage]) {
          this._currentLanguage = result.interfaceLanguage;
        }
        
        if (callback) callback(this._currentLanguage);
        resolve(this._currentLanguage);
      });
    });
  }

  /**
   * Apply translations to DOM elements
   * @param {HTMLElement} rootElement - Root element to start from
   */
  applyTranslations(rootElement = document) {
    // Find all elements with data-i18n attribute
    const elements = rootElement.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      
      // Special case for elements with parameters
      if (element.hasAttribute('data-i18n-params')) {
        const paramType = element.getAttribute('data-i18n-params');
        
        // Handle keyName parameter (for keyboard shortcut instruction)
        if (paramType === 'keyName') {
          const keySpan = element.querySelector('.key');
          if (keySpan) {
            const keyValue = keySpan.textContent;
            const translation = this.getTranslation(key, keyValue);
            
            // First, remove all text nodes but keep the span
            Array.from(element.childNodes).forEach(node => {
              if (node.nodeType === Node.TEXT_NODE) {
                element.removeChild(node);
              }
            });
            
            // Split the translation around the placeholder
            const parts = translation.split(/\{0\}/);
            
            // Insert the first part before the span
            if (parts[0]) {
              element.insertBefore(document.createTextNode(parts[0]), keySpan);
            }
            
            // Insert the second part after the span
            if (parts[1]) {
              element.appendChild(document.createTextNode(parts[1]));
            }
          }
        }
      }
      // Handle special case for placeholders
      else if (element.placeholder !== undefined && element.hasAttribute('data-i18n-placeholder')) {
        element.placeholder = this.getTranslation(key);
      } 
      // For regular elements with no special parameters
      else if (!element.hasAttribute('data-i18n-params')) {
        // For regular elements, update the inner text/HTML
        element.textContent = this.getTranslation(key);
      }
    });
    
    // Handle title attribute translations
    const titleElements = rootElement.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      element.title = this.getTranslation(key);
    });
    
    // Update document title if it has a data-i18n attribute
    if (document.documentElement.hasAttribute('data-i18n-title')) {
      document.title = this.getTranslation(document.documentElement.getAttribute('data-i18n-title'));
    }
  }

  /**
   * Get current language
   * @returns {string} - Current language code
   */
  getCurrentLanguage() {
    return this._currentLanguage;
  }

  /**
   * Get available languages
   * @returns {Object} - Available languages
   */
  getAvailableLanguages() {
    return this._languages;
  }
}

// Export class to global scope
window.LocalizationCore = LocalizationCore;

// Create a global i18n instance for backward compatibility and for use in popup/options
if (!window.i18n) {
  const localizationCore = new LocalizationCore();
  
  window.i18n = {
    getTranslation: localizationCore.getTranslation.bind(localizationCore),
    setLanguage: localizationCore.setLanguage.bind(localizationCore),
    loadLanguageSetting: localizationCore.loadLanguageSetting.bind(localizationCore),
    applyTranslations: localizationCore.applyTranslations.bind(localizationCore),
    AVAILABLE_LANGUAGES: localizationCore._languages,
    getCurrentLanguage: () => localizationCore._currentLanguage
  };

  // Auto-load language setting
  window.i18n.loadLanguageSetting(() => {
    // Auto-apply translations if DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      window.i18n.applyTranslations();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        window.i18n.applyTranslations();
      });
    }
  });
}

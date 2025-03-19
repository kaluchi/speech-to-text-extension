// Initialization when popup loads
document.addEventListener('DOMContentLoaded', function() {
  try {
    console.log("Popup loaded, initializing...");
    
    // Load the language setting and apply translations
    i18n.loadLanguageSetting(function(language) {
      console.log("Current language:", language);
      
      // Apply translations to all elements
      i18n.applyTranslations();
    });
    
    // Determine the target key based on platform
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const targetKey = isMac ? "Command" : "Ctrl";
    console.log("Target key detected:", targetKey);
    
    // Set the key name first
    const keyNameElement = document.getElementById('keyName');
    if (keyNameElement) {
      keyNameElement.textContent = targetKey;
      console.log("Key name set in interface");
      
      // Now let i18n.applyTranslations handle the full string with the key name as a parameter
      // This is done automatically when it processes elements with data-i18n-params
    } else {
      console.warn("Element with id 'keyName' not found");
    }
    
    // Check microphone access through content script
    console.log("Checking extension status...");
    checkContentScriptStatus();
    
    // Check API key
    console.log("Checking API key...");
    checkApiKey();
    
    // Find settings button
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
      console.log("Settings button found, setting up handler");
      settingsButton.addEventListener('click', openOptionsPage);
    } else {
      console.warn("Settings button not found");
    }
    
    console.log("Popup initialization complete");
  } catch (error) {
    console.error("Error initializing popup:", error);
    updateStatus('error', i18n.getTranslation('extension_init_error'));
  }
});

// Function to check content script status and microphone access
function checkContentScriptStatus() {
  try {
    // Find the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error("Error getting active tab:", chrome.runtime.lastError);
        updateStatus('error', i18n.getTranslation('access_tab_error'));
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        console.error("Failed to find active tab");
        updateStatus('error', i18n.getTranslation('tab_not_found'));
        return;
      }
      
      const currentTab = tabs[0];
      
      // Check URL - can't work with system pages
      if (currentTab.url.startsWith('chrome://') || 
          currentTab.url.startsWith('chrome-extension://') || 
          currentTab.url.startsWith('about:')) {
        console.log("System page detected:", currentTab.url);
        updateStatus('error', i18n.getTranslation('system_page_error'));
        return;
      }
      
      // Send message to content script of current tab
      chrome.tabs.sendMessage(currentTab.id, {command: "checkMicrophoneStatus"}, function(response) {
        if (chrome.runtime.lastError) {
          console.warn("Failed to connect to content script:", chrome.runtime.lastError);
          // Content script may not be running on some pages
          updateStatus('error', i18n.getTranslation('extension_unavailable'));
          return;
        }
        
        if (response) {
          console.log("Response received from content script:", response);
          
          if (response.hasAccess) {
            updateStatus('success', i18n.getTranslation('extension_active'));
          } else {
            updateStatus('error', response.errorMessage || i18n.getTranslation('mic_permission_required'));
          }
        } else {
          console.warn("Empty response received from content script");
          updateStatus('error', i18n.getTranslation('mic_status_check_failed'));
        }
      });
    });
  } catch (error) {
    console.error("Error checking content script status:", error);
    updateStatus('error', i18n.getTranslation('extension_status_check_error'));
  }
}

// Function to check API key
function checkApiKey() {
  try {
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (chrome.runtime.lastError) {
        console.error("Error getting API key:", chrome.runtime.lastError);
        updateApiKeyStatus(false, i18n.getTranslation('settings_access_error'));
        return;
      }
      
      if (!result.apiKey || result.apiKey.trim() === '') {
        updateApiKeyStatus(false, i18n.getTranslation('api_key_required'));
      } else if (!result.apiKey.startsWith('sk_')) {
        updateApiKeyStatus(false, i18n.getTranslation('invalid_api_key_format'));
      } else {
        updateApiKeyStatus(true, i18n.getTranslation('api_key_valid'));
      }
    });
  } catch (error) {
    console.error("Error checking API key:", error);
    updateApiKeyStatus(false, i18n.getTranslation('api_key_check_error'));
  }
}

// Function to update microphone status in UI
function updateStatus(type, message) {
  // Check for UI elements
  const statusElement = document.getElementById('status');
  if (!statusElement) {
    console.error('Status element not found in DOM');
    return;
  }
  
  const statusText = statusElement.querySelector('span');
  if (!statusText) {
    console.error('Text element not found in status element');
    return;
  }
  
  // Update UI
  statusElement.className = type === 'success' ? 'status' : 'status error';
  statusText.textContent = message;
  
  // If the message is a translation key, store it for language changes
  if (message.startsWith('[') && message.endsWith(']')) {
    const key = message.slice(1, -1);
    statusText.setAttribute('data-i18n-key', key);
  }
  
  console.log(`Status updated: ${message} (${type})`);
}

// Function to update API key status in UI
function updateApiKeyStatus(isValid, message) {
  console.log(`API key status: ${isValid ? 'valid' : 'invalid'} - ${message}`);
  
  // API key status affects general status if microphone is accessible
  const statusElement = document.getElementById('status');
  const statusText = statusElement?.querySelector('span');
  
  // If status is already showing an error, don't override it with API key message
  if (statusElement && statusText && statusElement.className === 'status') {
    if (!isValid) {
      statusElement.className = 'status error';
      statusText.textContent = message;
      
      // If the message is a translation key, store it for language changes
      if (message.startsWith('[') && message.endsWith(']')) {
        const key = message.slice(1, -1);
        statusText.setAttribute('data-i18n-key', key);
      }
    }
  }
}

// Function to open settings page
function openOptionsPage() {
  try {
    console.log("Attempting to open settings page...");
    
    // Open extension settings page
    if (chrome.runtime.openOptionsPage) {
      console.log("Using chrome.runtime.openOptionsPage");
      chrome.runtime.openOptionsPage();
    } else {
      console.log("chrome.runtime.openOptionsPage unavailable, using alternative method");
      
      try {
        // Get settings page URL
        const optionsUrl = chrome.runtime.getURL('options.html');
        console.log("Settings page URL:", optionsUrl);
        
        // Check availability of chrome.tabs API
        if (chrome.tabs && chrome.tabs.create) {
          console.log("Using chrome.tabs.create");
          
          // Try to open in new tab
          chrome.tabs.create({ url: optionsUrl }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error("Error opening tab:", chrome.runtime.lastError);
              fallbackOpenOptions(optionsUrl);
            } else {
              console.log("Settings page opened in new tab:", tab ? tab.id : "unknown");
            }
          });
        } else {
          console.log("chrome.tabs API unavailable, using fallback method");
          fallbackOpenOptions(optionsUrl);
        }
      } catch (error) {
        console.error("Error getting settings page URL:", error);
        alert(i18n.getTranslation('settings_open_error') + ": " + error.message);
      }
    }
  } catch (error) {
    console.error("General error opening settings page:", error);
    alert(i18n.getTranslation('settings_open_error') + ". " + i18n.getTranslation('check_console_details'));
  }
}

// Fallback method to open settings page
function fallbackOpenOptions(url) {
  try {
    console.log("Trying to open settings page with window.open");
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      console.warn("window.open returned null/undefined, popups may be blocked");
      alert(i18n.getTranslation('popup_blocked'));
    }
  } catch (error) {
    console.error("Error using fallback method:", error);
    alert(i18n.getTranslation('settings_open_error') + ": " + error.message);
  }
}

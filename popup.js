// Инициализация при загрузке popup
document.addEventListener('DOMContentLoaded', function() {
  try {
    console.log("Popup загружен, начинаем инициализацию...");
    
    // Определяем целевую клавишу в зависимости от платформы
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const targetKey = isMac ? "Command" : "Ctrl";
    console.log("Определена целевая клавиша:", targetKey);
    
    // Ищем элемент с id 'keyName'
    const keyNameElement = document.getElementById('keyName');
    if (keyNameElement) {
      keyNameElement.textContent = targetKey;
      console.log("Название клавиши установлено в интерфейсе");
    } else {
      console.warn("Элемент с id 'keyName' не найден");
    }
    
    // Проверяем доступ к микрофону через content script
    console.log("Проверяем статус расширения...");
    checkContentScriptStatus();
    
    // Проверяем наличие API ключа
    console.log("Проверяем API ключ...");
    checkApiKey();
    
    // Находим кнопку настроек
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
      console.log("Кнопка настроек найдена, устанавливаем обработчик");
      settingsButton.addEventListener('click', openOptionsPage);
    } else {
      console.warn("Кнопка настроек не найдена");
    }
    
    console.log("Инициализация popup завершена");
  } catch (error) {
    console.error("Ошибка инициализации popup:", error);
    updateStatus('error', 'Ошибка инициализации');
  }
});

// Функция для проверки статуса content script и доступа к микрофону
function checkContentScriptStatus() {
  try {
    // Находим активную вкладку
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при получении активной вкладки:", chrome.runtime.lastError);
        updateStatus('error', 'Не удалось получить доступ к вкладке');
        return;
      }
      
      if (!tabs || tabs.length === 0) {
        console.error("Не удалось найти активную вкладку");
        updateStatus('error', 'Не удалось найти активную вкладку');
        return;
      }
      
      const currentTab = tabs[0];
      
      // Проверяем URL вкладки - не можем работать с системными страницами
      if (currentTab.url.startsWith('chrome://') || 
          currentTab.url.startsWith('chrome-extension://') || 
          currentTab.url.startsWith('about:')) {
        console.log("Обнаружена системная страница:", currentTab.url);
        updateStatus('error', 'Расширение не работает на системных страницах');
        return;
      }
      
      // Отправляем сообщение в content script текущей вкладки
      chrome.tabs.sendMessage(currentTab.id, {command: "checkMicrophoneStatus"}, function(response) {
        if (chrome.runtime.lastError) {
          console.warn("Не удалось связаться с content script:", chrome.runtime.lastError);
          // На некоторых страницах content script может не быть запущен
          updateStatus('error', 'Расширение недоступно на этой странице');
          return;
        }
        
        if (response) {
          console.log("Получен ответ от content script:", response);
          
          if (response.hasAccess) {
            updateStatus('success', 'Расширение активно');
          } else {
            updateStatus('error', response.errorMessage || 'Требуется доступ к микрофону');
          }
        } else {
          console.warn("Получен пустой ответ от content script");
          updateStatus('error', 'Не удалось проверить статус микрофона');
        }
      });
    });
  } catch (error) {
    console.error("Ошибка при проверке статуса content script:", error);
    updateStatus('error', 'Ошибка при проверке статуса расширения');
  }
}

// Функция для проверки API ключа
function checkApiKey() {
  try {
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при получении API ключа:", chrome.runtime.lastError);
        updateApiKeyStatus(false, 'Ошибка доступа к настройкам');
        return;
      }
      
      if (!result.apiKey || result.apiKey.trim() === '') {
        updateApiKeyStatus(false, 'Требуется указать API ключ в настройках');
      } else if (!result.apiKey.startsWith('sk_')) {
        updateApiKeyStatus(false, 'Неверный формат API ключа (должен начинаться с sk_)');
      } else {
        updateApiKeyStatus(true, 'API ключ валиден');
      }
    });
  } catch (error) {
    console.error("Ошибка при проверке API ключа:", error);
    updateApiKeyStatus(false, 'Ошибка при проверке API ключа');
  }
}

// Функция для обновления статуса микрофона в UI
function updateStatus(type, message) {
  // Проверяем наличие элементов UI
  const statusElement = document.getElementById('status');
  if (!statusElement) {
    console.error('Элемент status не найден в DOM');
    return;
  }
  
  const statusText = statusElement.querySelector('span');
  if (!statusText) {
    console.error('Текстовый элемент не найден в элементе status');
    return;
  }
  
  // Обновляем UI
  statusElement.className = type === 'success' ? 'status' : 'status error';
  statusText.textContent = message;
  
  console.log(`Статус обновлен: ${message} (${type})`);
}

// Функция для обновления статуса API ключа в UI
function updateApiKeyStatus(isValid, message) {
  console.log(`Статус API ключа: ${isValid ? 'валидный' : 'невалидный'} - ${message}`);
  
  // Если требуется, можно добавить отдельный элемент UI для статуса API ключа
  // Сейчас статус API ключа влияет на общий статус, если микрофон доступен
  
  const statusElement = document.getElementById('status');
  const statusText = statusElement?.querySelector('span');
  
  // Если статус уже показывает ошибку, не переопределяем его сообщением об API ключе
  if (statusElement && statusText && statusElement.className === 'status') {
    if (!isValid) {
      statusElement.className = 'status error';
      statusText.textContent = message;
    }
  }
}

// Функция для открытия страницы настроек
function openOptionsPage() {
  try {
    console.log("Попытка открыть страницу настроек...");
    
    // Открываем страницу настроек расширения
    if (chrome.runtime.openOptionsPage) {
      console.log("Используем chrome.runtime.openOptionsPage");
      chrome.runtime.openOptionsPage();
    } else {
      console.log("chrome.runtime.openOptionsPage недоступен, используем альтернативный метод");
      
      try {
        // Получаем URL страницы настроек
        const optionsUrl = chrome.runtime.getURL('options.html');
        console.log("URL страницы настроек:", optionsUrl);
        
        // Проверяем доступность chrome.tabs API
        if (chrome.tabs && chrome.tabs.create) {
          console.log("Используем chrome.tabs.create");
          
          // Пытаемся открыть в новой вкладке
          chrome.tabs.create({ url: optionsUrl }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error("Ошибка при открытии вкладки:", chrome.runtime.lastError);
              fallbackOpenOptions(optionsUrl);
            } else {
              console.log("Страница настроек открыта в новой вкладке:", tab ? tab.id : "неизвестно");
            }
          });
        } else {
          console.log("chrome.tabs API недоступен, используем запасной метод");
          fallbackOpenOptions(optionsUrl);
        }
      } catch (error) {
        console.error("Ошибка при получении URL страницы настроек:", error);
        alert("Не удалось открыть страницу настроек: " + error.message);
      }
    }
  } catch (error) {
    console.error("Общая ошибка при открытии страницы настроек:", error);
    alert("Не удалось открыть страницу настроек. Пожалуйста, проверьте консоль для деталей.");
  }
}

// Запасной метод открытия страницы настроек
function fallbackOpenOptions(url) {
  try {
    console.log("Пытаемся открыть страницу настроек через window.open");
    const newWindow = window.open(url, '_blank');
    
    if (!newWindow) {
      console.warn("window.open вернул null/undefined, возможно заблокированы всплывающие окна");
      alert("Не удалось открыть страницу настроек. Возможно, в браузере заблокированы всплывающие окна.");
    }
  } catch (error) {
    console.error("Ошибка при использовании запасного метода:", error);
    alert("Не удалось открыть страницу настроек: " + error.message);
  }
}
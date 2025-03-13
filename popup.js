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
    
    // Проверяем доступ к микрофону
    console.log("Проверяем доступ к микрофону...");
    checkMicrophoneAccess();
    
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
  }
});

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

// Функция для проверки доступа к микрофону
async function checkMicrophoneAccess() {
  console.log("Функция checkMicrophoneAccess начала выполнение");
  
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
  
  let stream = null;
  
  try {
    // Проверяем, поддерживается ли API MediaDevices
    if (!navigator.mediaDevices) {
      console.warn('MediaDevices API не поддерживается в этом браузере');
      statusElement.className = 'status error';
      statusText.textContent = 'Доступ к микрофону не поддерживается браузером';
      
      // Несмотря на ошибку, проверяем API ключ
      try {
        checkApiKey(statusElement, statusText);
      } catch (apiCheckError) {
        console.error('Ошибка при проверке API ключа:', apiCheckError);
      }
      
      return;
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
      console.warn('getUserMedia API не поддерживается в этом браузере');
      statusElement.className = 'status error';
      statusText.textContent = 'Доступ к микрофону не поддерживается браузером';
      
      // Несмотря на ошибку, проверяем API ключ
      try {
        checkApiKey(statusElement, statusText);
      } catch (apiCheckError) {
        console.error('Ошибка при проверке API ключа:', apiCheckError);
      }
      
      return;
    }
    
    // Пытаемся получить доступ к микрофону
    console.log('Запрашиваем доступ к микрофону...');
    
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Если доступ получен, показываем статус "Активно"
    console.log('Доступ к микрофону получен успешно');
    statusElement.className = 'status';
    statusText.textContent = 'Расширение активно';
    
    // Проверяем API ключ
    try {
      console.log('Проверяем API ключ...');
      checkApiKey(statusElement, statusText);
    } catch (apiCheckError) {
      console.error('Ошибка при проверке API ключа:', apiCheckError);
    }
    
  } catch (error) {
    // Обрабатываем разные типы ошибок
    console.error('Ошибка доступа к микрофону:', error);
    
    statusElement.className = 'status error';
    
    // Определяем тип ошибки и устанавливаем соответствующее сообщение
    if (error.name) {
      console.log('Тип ошибки:', error.name);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        statusText.textContent = 'Доступ к микрофону запрещен';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        statusText.textContent = 'Микрофон не найден';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        statusText.textContent = 'Микрофон занят другим приложением';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        statusText.textContent = 'Технические ограничения микрофона';
      } else if (error.name === 'TypeError') {
        statusText.textContent = 'Ошибка типа при доступе к микрофону';
      } else {
        statusText.textContent = 'Ошибка микрофона: ' + error.name;
      }
    } else {
      statusText.textContent = 'Требуется доступ к микрофону';
    }
    
    // Несмотря на ошибку, проверяем API ключ
    try {
      console.log('Проверяем API ключ несмотря на ошибку микрофона...');
      checkApiKey(statusElement, statusText);
    } catch (apiCheckError) {
      console.error('Ошибка при проверке API ключа:', apiCheckError);
    }
  } finally {
    // Освобождаем ресурсы - важно остановить все треки, если они есть
    if (stream) {
      try {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Трек микрофона остановлен:', track.kind);
        });
        console.log('Все треки микрофона остановлены');
      } catch (trackError) {
        console.error('Ошибка при освобождении ресурсов микрофона:', trackError);
      }
    }
  }
  
  console.log("Функция checkMicrophoneAccess завершена");
}

// Функция для проверки API ключа
function checkApiKey(statusElement, statusText) {
  try {
    chrome.storage.sync.get(['apiKey'], function(result) {
      if (chrome.runtime.lastError) {
        console.error("Ошибка при получении API ключа:", chrome.runtime.lastError);
        statusElement.className = 'status error';
        statusText.textContent = 'Ошибка доступа к настройкам';
        return;
      }
      
      if (!result.apiKey || result.apiKey.trim() === '') {
        statusElement.className = 'status error';
        statusText.textContent = 'Требуется указать API ключ в настройках';
      } else if (!result.apiKey.startsWith('sk_')) {
        statusElement.className = 'status error';
        statusText.textContent = 'Неверный формат API ключа (должен начинаться с sk_)';
      }
    });
  } catch (error) {
    console.error("Ошибка при проверке API ключа:", error);
    statusElement.className = 'status error';
    statusText.textContent = 'Ошибка при проверке API ключа';
  }
}
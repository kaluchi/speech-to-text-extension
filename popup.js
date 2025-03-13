document.addEventListener('DOMContentLoaded', function() {
  // Определяем целевую клавишу в зависимости от платформы
  const isMac = navigator.platform.toLowerCase().includes("mac");
  const targetKey = isMac ? "Command" : "Ctrl";
  
  // Устанавливаем название клавиши в инструкции
  document.getElementById('keyName').textContent = targetKey;
  
  // Проверяем доступ к микрофону
  checkMicrophoneAccess();
  
  // Слушатель для кнопки настроек
  document.getElementById('settings-button').addEventListener('click', function() {
    // Открываем страницу настроек расширения
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
});

// Функция для проверки доступа к микрофону
async function checkMicrophoneAccess() {
  const statusElement = document.getElementById('status');
  const statusText = statusElement.querySelector('span');
  
  try {
    // Пытаемся получить доступ к микрофону
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Если доступ получен, показываем статус "Активно"
    statusElement.className = 'status';
    statusText.textContent = 'Расширение активно';
    
    // Проверяем API ключ
    checkApiKey(statusElement, statusText);
    
    // Освобождаем ресурсы - важно остановить все треки
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    // Если доступ не получен, показываем статус "Ошибка"
    statusElement.className = 'status error';
    statusText.textContent = 'Требуется доступ к микрофону';
    
    console.error('Ошибка доступа к микрофону:', error);
  }
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
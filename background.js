// Обработчик сообщений от content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'openOptionsPage') {
    // Открываем страницу настроек
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
    sendResponse({ success: true });
  }
  // Важно вернуть true для асинхронного ответа
  return true;
}); 
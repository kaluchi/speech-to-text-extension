// Message handler from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'openOptionsPage') {
    // Open the options page
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
    sendResponse({ success: true });
  }
  // Important to return true for asynchronous response
  return true;
});

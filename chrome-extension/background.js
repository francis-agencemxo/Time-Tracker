let currentTabUrl = null;
let currentStart = null;
let sendTimer = null;

function sendTimeSpent(url, durationSeconds) {
  if (!url || durationSeconds <= 0) return;

  fetch('http://localhost:56000/url-track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, duration: durationSeconds })
  }).catch(err => console.warn('Failed to send browsing data:', err));
}

function handleTabUpdate(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    const newUrl = tab.url;

    if (!newUrl || newUrl.startsWith('chrome://')) return;

    const now = Date.now();
    if (currentTabUrl && currentStart) {
      const duration = Math.floor((now - currentStart) / 1000);
      sendTimeSpent(currentTabUrl, duration);
    }

    currentTabUrl = newUrl;
    currentStart = now;
  });
}

chrome.tabs.onActivated.addListener(handleTabUpdate);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    handleTabUpdate({ tabId: tab.id });
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (tabs.length > 0) {
      handleTabUpdate({ tabId: tabs[0].id });
    }
  });
});

// On shutdown
chrome.runtime.onSuspend.addListener(() => {
  if (currentTabUrl && currentStart) {
    const duration = Math.floor((Date.now() - currentStart) / 1000);
    sendTimeSpent(currentTabUrl, duration);
  }
});

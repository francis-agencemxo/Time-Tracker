let currentTabUrl = null;
let currentStart = null;

function sendTimeSpent(url, durationSeconds, startTimestamp, endTimestamp) {
  if (!url || durationSeconds <= 0) return;

  fetch('http://localhost:56000/url-track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      duration: durationSeconds,
      start: new Date(startTimestamp).toISOString(),
      end: new Date(endTimestamp).toISOString()
    })
  }).catch(err => console.warn('Failed to send browsing data:', err));
}

function handleTabUpdate(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    const newUrl = tab.url;
    if (!newUrl || newUrl.startsWith('chrome://')) return;

    const now = Date.now();

    if (currentTabUrl && currentStart) {
      const duration = Math.floor((now - currentStart) / 1000);
      sendTimeSpent(currentTabUrl, duration, currentStart, now);
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

chrome.runtime.onSuspend.addListener(() => {
  if (currentTabUrl && currentStart) {
    const now = Date.now();
    const duration = Math.floor((now - currentStart) / 1000);
    sendTimeSpent(currentTabUrl, duration, currentStart, now);
  }
});

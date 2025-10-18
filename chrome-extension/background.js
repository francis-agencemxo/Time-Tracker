let currentTabUrl = null;
let currentStart = null;
let trackerServerPort = 56000;

// Import history sync functions
importScripts('history-sync.js');

// Load initial settings
chrome.storage.sync.get({ trackerServerPort }, (items) => {
  trackerServerPort = items.trackerServerPort;
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.trackerServerPort) {
      trackerServerPort = changes.trackerServerPort.newValue;
    }

    if (changes.activeProject) {
      const newProject = changes.activeProject.newValue;
      updateBadge(newProject);
    }
  }
});

// Set badge when extension loads
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get("activeProject", ({ activeProject }) => {
    updateBadge(activeProject);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("activeProject", ({ activeProject }) => {
    updateBadge(activeProject);
  });
});

// Listen for messages from popup/options to trigger history sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncHistory') {
    const { startTime, endTime, projectName } = request;

    syncHistoryRange(startTime, endTime, trackerServerPort, projectName)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true; // Keep channel open for async response
  }

  if (request.action === 'syncHistorySinceLastSync') {
    const { projectName } = request;

    syncHistorySinceLastSync(trackerServerPort, projectName)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  }

  if (request.action === 'syncHistoryForDate') {
    const { date, projectName } = request;

    syncHistoryForDate(new Date(date), trackerServerPort, projectName)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  }
});

function updateBadge(projectName) {
  if (!projectName) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: projectName.slice(0, 4).toLowerCase() });
    chrome.action.setBadgeBackgroundColor({ color: '#00BCD4' });
  }
}

function sendTimeSpent(url, durationSeconds, startTimestamp, endTimestamp) {
  if (!url || durationSeconds <= 0) return;

  chrome.storage.sync.get("activeProject", ({ activeProject }) => {
    fetch(`http://localhost:${trackerServerPort}/url-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        duration: durationSeconds,
        start: new Date(startTimestamp).toISOString(),
        end: new Date(endTimestamp).toISOString(),
        project: activeProject || ""
      })
    }).catch(err => console.warn('❌ Failed to send tracking data:', err));
  });
}

function handleTabUpdate(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

    const now = Date.now();

    if (currentTabUrl && currentStart) {
      const duration = Math.floor((now - currentStart) / 1000);
      sendTimeSpent(currentTabUrl, duration, currentStart, now);
    }

    currentTabUrl = tab.url;
    currentStart = now;
  });
}

// Track active tab switching
chrome.tabs.onActivated.addListener(handleTabUpdate);

// Track URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    handleTabUpdate({ tabId: tab.id });
  }
});

// Handle window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (tabs.length > 0) {
      handleTabUpdate({ tabId: tabs[0].id });
    }
  });
});

// Save on suspend
chrome.runtime.onSuspend.addListener(() => {
  if (currentTabUrl && currentStart) {
    const now = Date.now();
    const duration = Math.floor((now - currentStart) / 1000);
    sendTimeSpent(currentTabUrl, duration, currentStart, now);
  }
});

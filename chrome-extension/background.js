console.log('[CodePulse] Background script initializing...');

let currentTabUrl = null;
let currentStart = null;
let trackerServerPort = 56000;
let meetingProjectOverride = null; // Store project selection for meeting URLs

// Import history sync functions
importScripts('history-sync.js');

console.log('[CodePulse] Background script loaded successfully!');

// Load initial settings
chrome.storage.sync.get({ trackerServerPort }, (items) => {
  trackerServerPort = items.trackerServerPort;
  console.log('[CodePulse] Server port loaded:', trackerServerPort);
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

  if (request.action === 'setMeetingProject') {
    const { url, projectName } = request;
    meetingProjectOverride = { url, projectName };
    sendResponse({ success: true });
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

  // Check if this is a meeting URL and use override if available
  let projectToUse = null;
  if (meetingProjectOverride && url.includes(meetingProjectOverride.url)) {
    projectToUse = meetingProjectOverride.projectName;
  }

  chrome.storage.sync.get("activeProject", ({ activeProject }) => {
    const finalProject = projectToUse || activeProject || "";

    fetch(`http://localhost:${trackerServerPort}/url-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        duration: durationSeconds,
        start: new Date(startTimestamp).toISOString(),
        end: new Date(endTimestamp).toISOString(),
        project: finalProject
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

    // Check if this is a Google Meet URL and prompt for project
    console.log('[CodePulse] Tab URL:', tab.url);
    if (tab.url.includes('meet.google.com/')) {
      console.log('[CodePulse] Google Meet detected! Triggering meeting prompt...');
      promptForMeetingProject(tab.url);
    }
  });
}

async function promptForMeetingProject(url) {
  console.log('[CodePulse] promptForMeetingProject called with URL:', url);

  // Check if we already have a project set for this meeting session
  if (meetingProjectOverride && url.includes(meetingProjectOverride.url)) {
    console.log('[CodePulse] Meeting already has project assigned:', meetingProjectOverride.projectName);
    return; // Already set for this session, don't prompt again
  }

  console.log('[CodePulse] Checking for saved meeting patterns...');
  try {
    // First, check if there's a saved pattern for this meeting URL
    const matchResponse = await fetch(`http://localhost:${trackerServerPort}/api/meeting-patterns/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    // Check if response is OK before parsing
    if (!matchResponse.ok) {
      console.warn(`Meeting pattern match API returned ${matchResponse.status}`);
      // Continue to show manual selection prompt
    } else {
      const contentType = matchResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const matchResult = await matchResponse.json();

        if (matchResult.matched) {
          // Auto-assign the project based on saved pattern
          meetingProjectOverride = { url, projectName: matchResult.projectName };
          console.log(`✅ Auto-assigned meeting to project: ${matchResult.projectName}`);

          // Show a subtle notification that the meeting was auto-assigned
          chrome.notifications.create({
            type: 'basic',
            title: '✅ Meeting Auto-Assigned',
            message: `This meeting is being tracked under "${matchResult.projectName}"`,
            priority: 1,
            requireInteraction: false
          });

          // Auto-dismiss the notification after 5 seconds
          setTimeout(() => {
            chrome.notifications.clear(`meeting_auto_${Date.now()}`);
          }, 5000);

          return;
        }
      } else {
        const text = await matchResponse.text();
        console.warn('Meeting pattern match API returned non-JSON:', text.substring(0, 100));
      }
    }

    // No saved pattern found or API error, prompt the user to select a project
    console.log('[CodePulse] No saved pattern, fetching projects...');
    const projectsResponse = await fetch(`http://localhost:${trackerServerPort}/api/projects`);

    if (!projectsResponse.ok) {
      console.error(`[CodePulse] Projects API returned ${projectsResponse.status}`);
      return;
    }

    const projects = await projectsResponse.json();
    console.log('[CodePulse] Fetched projects:', projects.length);

    // Generate a unique ID for this meeting notification
    const meetingId = `meeting_${Date.now()}`;

    console.log('[CodePulse] Creating notification with ID:', meetingId);

    // Create notification with buttons for project selection
    chrome.notifications.create(meetingId, {
      type: 'basic',
      title: '🎥 Meeting Detected',
      message: 'Click to assign this Google Meet session to a project',
      priority: 2,
      requireInteraction: true
    }, (notificationId) => {
      console.log('[CodePulse] Notification created:', notificationId);
      // Store the URL associated with this notification
      chrome.storage.local.set({
        [notificationId]: { url, projects: projects.map(p => p.name) }
      });
    });
  } catch (error) {
    console.error('Failed to handle meeting detection:', error);
    console.error('Error details:', error.message, error.stack);
  }
}

// Track active tab switching
chrome.tabs.onActivated.addListener(handleTabUpdate);

// Track URL changes - trigger on URL change OR when complete
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Trigger on URL change (for SPAs like Google Meet)
  if (changeInfo.url && tab.active) {
    console.log('[CodePulse] URL changed:', changeInfo.url);
    handleTabUpdate({ tabId: tab.id });
  }
  // Also trigger when page loads completely
  else if (changeInfo.status === "complete" && tab.active) {
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

// Handle notification clicks to open project selector
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith('meeting_')) return;

  // Get the meeting data
  const data = await chrome.storage.local.get(notificationId);
  const meetingData = data[notificationId];

  if (!meetingData) return;

  // Clear the notification
  chrome.notifications.clear(notificationId);

  // Open the extension popup to select project
  // Since we can't directly open popup programmatically, we create a simple HTML page for project selection
  chrome.windows.create({
    url: chrome.runtime.getURL('meeting-selector.html') + `?notificationId=${notificationId}`,
    type: 'popup',
    width: 400,
    height: 550
  });
});

console.log('[CodePulse] Background script initializing...');

let currentTabUrl = null;
let currentStart = null;
let trackerServerPort = 56000;
let meetingProjectOverride = null; // Store project selection for meeting URLs
const pendingMeetingSelections = {}; // Track forced selection windows by ID
let previousActiveProject = null; // Store active project before meeting override

function captureMeetingMetadata(normalizedUrl) {
  chrome.tabs.query({ url: `${normalizedUrl}*` }, (tabs) => {
    if (chrome.runtime.lastError) {
      console.warn('[CodePulse] Failed to query tabs for meeting metadata:', chrome.runtime.lastError.message);
      return;
    }

    if (!meetingProjectOverride || meetingProjectOverride.url !== normalizedUrl) {
      return;
    }

    if (tabs.length > 0) {
      const tab = tabs[0];
      meetingProjectOverride.tabId = tab.id;
      meetingProjectOverride.meetingTitle = sanitizeMeetingTitle(tab.title) || meetingProjectOverride.meetingTitle || null;
      console.log('[CodePulse] Captured meeting metadata', {
        title: meetingProjectOverride.meetingTitle,
        tabId: meetingProjectOverride.tabId
      });
    }
  });
}

function sanitizeMeetingTitle(rawTitle) {
  if (!rawTitle) return rawTitle;
  return rawTitle.replace(/\s*\|.*$/, '').trim();
}

function normalizeMeetingUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    console.warn('[CodePulse] Failed to normalize meeting URL, falling back to raw value', rawUrl);
    return rawUrl;
  }
}

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
      console.log('[CodePulse] chrome.storage.sync activeProject changed:', newProject);
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setMeetingProject') {
    const { url, projectName, selectionId } = request;
    const normalizedUrl = normalizeMeetingUrl(url);
    const defaultTitle = normalizedUrl.substring(normalizedUrl.lastIndexOf('/') + 1);
    meetingProjectOverride = {
      url: normalizedUrl,
      projectName,
      meetingTitle: defaultTitle ? defaultTitle.replace(/-/g, ' ') : null,
      tabId: null
    };

    console.log('[CodePulse] setMeetingProject received', {
      url: normalizedUrl,
      projectName,
      selectionId
    });

    if (selectionId && pendingMeetingSelections[selectionId]) {
      console.log('[CodePulse] Clearing pending selection', selectionId);
      delete pendingMeetingSelections[selectionId];
      chrome.storage.local.remove(selectionId);
    }

    chrome.storage.sync.get('activeProject', ({ activeProject }) => {
      if (previousActiveProject === null && activeProject !== undefined) {
        previousActiveProject = activeProject || null;
        console.log('[CodePulse] Stored previous active project before meeting override:', previousActiveProject || 'none');
      }

      chrome.storage.sync.set({ activeProject: projectName }, () => {
        if (chrome.runtime.lastError) {
          console.error('[CodePulse] Failed to sync activeProject from meeting selector:', chrome.runtime.lastError.message);
        } else {
          console.log('[CodePulse] Active project updated from meeting selector:', projectName);
          updateBadge(projectName);
          captureMeetingMetadata(normalizedUrl);
        }
      });
    });

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
  let sessionType = 'browsing';
  let meetingTitle = null;
  if (meetingProjectOverride && url.includes(meetingProjectOverride.url)) {
    projectToUse = meetingProjectOverride.projectName;
    sessionType = 'meeting';
    meetingTitle = meetingProjectOverride.meetingTitle || null;
  }

  chrome.storage.sync.get("activeProject", ({ activeProject }) => {
    const finalProject = projectToUse || activeProject || "";

    const payload = {
      url,
      duration: durationSeconds,
      start: new Date(startTimestamp).toISOString(),
      end: new Date(endTimestamp).toISOString(),
      project: finalProject,
      sessionType
    };

    if (meetingTitle) {
      payload.meetingTitle = meetingTitle;
    }

    fetch(`http://localhost:${trackerServerPort}/url-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.warn('❌ Failed to send tracking data:', err));
  });
}

function clearMeetingProjectOverride(reason) {
  if (!meetingProjectOverride) return;

  const clearedMeeting = { ...meetingProjectOverride };
  meetingProjectOverride = null;

  chrome.storage.sync.get("activeProject", ({ activeProject }) => {
    if (activeProject === clearedMeeting.projectName) {
      chrome.storage.sync.set({ activeProject: previousActiveProject }, () => {
        if (chrome.runtime.lastError) {
          console.error('[CodePulse] Failed to restore active project after meeting:', chrome.runtime.lastError.message);
        } else {
          console.log('[CodePulse] Cleared meeting project override; restored active project to:', previousActiveProject || 'none', 'Reason:', reason);
        }
        previousActiveProject = null;
      });
    } else {
      console.log('[CodePulse] Meeting override cleared but active project has changed externally; leaving as-is.', { activeProject, reason });
      previousActiveProject = null;
    }
  });
}

function handleTabUpdate(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (!tab || !tab.url || tab.url.startsWith('chrome://')) return;

    const now = Date.now();
    const previousUrl = currentTabUrl;
    const previousStart = currentStart;

    if (previousUrl && previousStart) {
      const duration = Math.floor((now - previousStart) / 1000);
      sendTimeSpent(previousUrl, duration, previousStart, now);
    }

    currentTabUrl = tab.url;
    currentStart = now;

    const isMeetingTab = meetingProjectOverride && tab.url.includes(meetingProjectOverride.url);
    if (isMeetingTab) {
      meetingProjectOverride.tabId = tab.id;
      meetingProjectOverride.meetingTitle = sanitizeMeetingTitle(tab.title) || meetingProjectOverride.meetingTitle || null;
    }

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
  const meetingKey = normalizeMeetingUrl(url);

  // Check if we already have a project set for this meeting session
  if (meetingProjectOverride && meetingKey === meetingProjectOverride.url) {
    console.log('promptForMeetingProject [CodePulse] Meeting already has project assigned:', meetingProjectOverride.projectName);
    return; // Already set for this session, don't prompt again
  }

  console.log('promptForMeetingProject [CodePulse] Checking for saved meeting patterns...');
  try {
          console.log("First, check if there's a saved pattern for this meeting URL");
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
          const defaultTitle = meetingKey.substring(meetingKey.lastIndexOf('/') + 1);
          meetingProjectOverride = {
            url: meetingKey,
            projectName: matchResult.projectName,
            meetingTitle: defaultTitle ? defaultTitle.replace(/-/g, ' ') : null,
            tabId: null
          };

          chrome.storage.sync.get('activeProject', ({ activeProject }) => {
            if (previousActiveProject === null && activeProject !== undefined) {
              previousActiveProject = activeProject || null;
              console.log('[CodePulse] Stored previous active project before auto-assigned meeting override:', previousActiveProject || 'none');
            }

            chrome.storage.sync.set({ activeProject: matchResult.projectName }, () => {
              if (chrome.runtime.lastError) {
                console.error('[CodePulse] Failed to update activeProject for auto-assigned meeting:', chrome.runtime.lastError.message);
              } else {
                console.log('[CodePulse] Active project auto-updated from meeting pattern:', matchResult.projectName);
                updateBadge(matchResult.projectName);
                captureMeetingMetadata(meetingKey);
              }
            });
          });

          console.log(`✅ Auto-assigned meeting to project: ${matchResult.projectName}`);

          return;
        }
      } else {
        const text = await matchResponse.text();
        console.warn('Meeting pattern match API returned non-JSON:', text.substring(0, 100));
      }
    }

    // No saved pattern found or API error, prompt the user to select a project
    console.log('[CodePulse] No saved pattern, opening forced selector...');

    const existingEntry = Object.entries(pendingMeetingSelections)
      .find(([, entry]) => entry.meetingKey === meetingKey);

    if (existingEntry) {
      const current = existingEntry[1];
      if (current.windowId !== null && current.windowId !== undefined) {
        console.log('[CodePulse] Meeting selector already open, focusing existing window');
        chrome.windows.update(current.windowId, { focused: true });
      } else {
        console.log('[CodePulse] Meeting selector is already being opened, waiting for window ID...');
      }
      return;
    }

    // Generate a unique ID for this meeting selection flow
    const selectionId = `meeting_${Date.now()}`;
    pendingMeetingSelections[selectionId] = {
      meetingKey,
      windowId: null
    };

    const selectionUrl = `${chrome.runtime.getURL('meeting-selector.html')}?notificationId=${selectionId}`;

    chrome.storage.local.set({ [selectionId]: { url: meetingKey } }, () => {
      chrome.windows.create({
        url: selectionUrl,
        type: 'popup',
        focused: true,
        width: 420,
        height: 600
      }, (createdWindow) => {
        if (chrome.runtime.lastError) {
          console.log('[CodePulse] Failed to open meeting selector window:', chrome.runtime.lastError.message);
          delete pendingMeetingSelections[selectionId];
          chrome.storage.local.remove(selectionId);
          return;
        }

        console.log('[CodePulse] Meeting selector window opened:', selectionId, 'windowId:', createdWindow?.id);
        pendingMeetingSelections[selectionId] = {
          meetingKey,
          windowId: createdWindow?.id ?? null
        };
      });
    });
  } catch (error) {
    console.log('Failed to handle meeting detection:', error);
    console.log('Error details:', error.message, error.stack);
  }
}

// Track active tab switching
chrome.tabs.onActivated.addListener(handleTabUpdate);

// Track URL changes - trigger on URL change OR when complete
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && meetingProjectOverride) {
    const normalizedUrl = normalizeMeetingUrl(changeInfo.url);
    const isMeetingUrl = normalizedUrl === meetingProjectOverride.url;

    if (!meetingProjectOverride.tabId && isMeetingUrl) {
      meetingProjectOverride.tabId = tabId;
    }

    if (meetingProjectOverride.tabId === tabId && !isMeetingUrl) {
      clearMeetingProjectOverride('Meeting tab navigated away');
    }
  }

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

chrome.tabs.onRemoved.addListener((tabId) => {
  if (meetingProjectOverride && meetingProjectOverride.tabId === tabId) {
    clearMeetingProjectOverride('Meeting tab closed');
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

  if (meetingProjectOverride) {
    clearMeetingProjectOverride('Runtime suspended');
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  console.log('[CodePulse] Window removed', windowId);
  const pendingEntry = Object.entries(pendingMeetingSelections)
    .find(([, entry]) => entry.windowId === windowId);

  if (!pendingEntry) return;

  const [selectionId, entry] = pendingEntry;
  const selectionUrl = `${chrome.runtime.getURL('meeting-selector.html')}?notificationId=${selectionId}`;

  console.log('[CodePulse] Meeting selector window closed without selection, reopening...');

  chrome.storage.local.set({ [selectionId]: { url: entry.meetingKey } }, () => {
    chrome.windows.create({
      url: selectionUrl,
      type: 'popup',
      focused: true,
      width: 420,
      height: 600
    }, (newWindow) => {
      if (chrome.runtime.lastError) {
        console.log('[CodePulse] Failed to reopen meeting selector window:', chrome.runtime.lastError.message);
        return;
      }

      console.log('[CodePulse] Meeting selector window reopened:', selectionId, 'windowId:', newWindow?.id);
      pendingMeetingSelections[selectionId] = {
        meetingKey: entry.meetingKey,
        windowId: newWindow?.id ?? null
      };
    });
  });
});

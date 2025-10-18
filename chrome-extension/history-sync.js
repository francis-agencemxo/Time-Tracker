// History Sync Module
// Syncs missed URL navigations from browser history

const HISTORY_SYNC_KEY = 'lastHistorySync';
const DEFAULT_VISIT_DURATION = 60; // Default duration if we can't calculate (1 minute)

/**
 * Sync browser history for a given time range
 * @param {number} startTime - Start timestamp in milliseconds
 * @param {number} endTime - End timestamp in milliseconds
 * @param {number} trackerServerPort - Port for the tracker server
 * @param {string} projectName - Optional project name to assign
 */
async function syncHistoryRange(startTime, endTime, trackerServerPort, projectName = '') {
  return new Promise((resolve, reject) => {
    chrome.history.search(
      {
        text: '',
        startTime: startTime,
        endTime: endTime,
        maxResults: 10000
      },
      async (historyItems) => {
        if (!historyItems || historyItems.length === 0) {
          console.log('📜 No history items found for sync');
          resolve({ synced: 0, failed: 0 });
          return;
        }

        console.log(`📜 Found ${historyItems.length} history items to process`);

        // Get detailed visit info for each history item
        const visitPromises = historyItems.map(item => getVisitsForUrl(item.url, startTime, endTime));
        const allVisits = await Promise.all(visitPromises);

        let synced = 0;
        let failed = 0;

        // Process each visit
        for (const visits of allVisits) {
          for (const visit of visits) {
            try {
              await sendHistoryVisit(visit, trackerServerPort, projectName);
              synced++;
            } catch (err) {
              console.warn('❌ Failed to sync visit:', err);
              failed++;
            }
          }
        }

        console.log(`✅ History sync complete: ${synced} synced, ${failed} failed`);
        resolve({ synced, failed });
      }
    );
  });
}

/**
 * Get all visits for a URL in a time range
 */
function getVisitsForUrl(url, startTime, endTime) {
  return new Promise((resolve) => {
    chrome.history.getVisits({ url }, (visits) => {
      if (!visits) {
        resolve([]);
        return;
      }

      // Filter visits within time range and calculate durations
      const filteredVisits = visits
        .filter(v => v.visitTime >= startTime && v.visitTime <= endTime)
        .map((visit, index, array) => {
          // Calculate duration based on next visit or use default
          let duration = DEFAULT_VISIT_DURATION;

          if (index < array.length - 1) {
            const nextVisit = array[index + 1];
            duration = Math.floor((nextVisit.visitTime - visit.visitTime) / 1000);

            // Cap duration at 30 minutes (probably left tab open)
            if (duration > 1800) {
              duration = DEFAULT_VISIT_DURATION;
            }
          }

          return {
            url,
            visitTime: visit.visitTime,
            duration,
            visitId: visit.visitId,
            transition: visit.transition
          };
        });

      resolve(filteredVisits);
    });
  });
}

/**
 * Send a history visit to the tracker server
 */
async function sendHistoryVisit(visit, trackerServerPort, projectName) {
  const response = await fetch(`http://localhost:${trackerServerPort}/url-track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: visit.url,
      duration: visit.duration,
      start: new Date(visit.visitTime).toISOString(),
      end: new Date(visit.visitTime + visit.duration * 1000).toISOString(),
      project: projectName,
      source: 'history-sync' // Mark as synced from history
    })
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  return response.json();
}

/**
 * Sync history since last sync
 */
async function syncHistorySinceLastSync(trackerServerPort, projectName = '') {
  const data = await chrome.storage.local.get(HISTORY_SYNC_KEY);
  const lastSync = data[HISTORY_SYNC_KEY] || Date.now() - (24 * 60 * 60 * 1000); // Default to 24h ago
  const now = Date.now();

  console.log(`📜 Syncing history from ${new Date(lastSync).toISOString()} to ${new Date(now).toISOString()}`);

  const result = await syncHistoryRange(lastSync, now, trackerServerPort, projectName);

  // Update last sync time
  await chrome.storage.local.set({ [HISTORY_SYNC_KEY]: now });

  return result;
}

/**
 * Sync history for a specific date
 */
async function syncHistoryForDate(date, trackerServerPort, projectName = '') {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  console.log(`📜 Syncing history for ${startOfDay.toDateString()}`);

  return syncHistoryRange(startOfDay.getTime(), endOfDay.getTime(), trackerServerPort, projectName);
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    syncHistoryRange,
    syncHistorySinceLastSync,
    syncHistoryForDate
  };
}

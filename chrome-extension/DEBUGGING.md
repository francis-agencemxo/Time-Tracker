# Chrome Extension Debugging Guide

This guide will help you debug issues with the CodePulse Browsing Tracker Chrome extension.

## Overview

The extension consists of several components that log useful debugging information:
- **Background Script** (`background.js`) - Handles tab tracking, meeting detection, and time tracking
- **Popup** (`popup.js`) - The extension popup UI for project selection
- **History Sync** (`history-sync.js`) - Syncs browser history to the tracker
- **Content Script** (`content.js`) - Runs on web pages for floating toolbar
- **Options Page** (`options.js`) - Extension settings page

## How to Access Logs

### 1. Background Service Worker Logs

The background script is where most of the tracking logic happens. To view its logs:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Find "Code Pulse Browsing Tracker" in the list
4. Click on **"service worker"** link (or **"Inspect views: service worker"**)
5. This opens the DevTools console for the background script

**What you'll see:**
- `[CodePulse] Background script initializing...` - Extension starting up
- `[CodePulse] Server port loaded: 56000` - Tracker server port configuration
- `[CodePulse] Tab URL: https://...` - Currently active tab
- `[CodePulse] Google Meet detected!` - Meeting URL detection
- `✅ Auto-assigned meeting to project: ...` - Meeting auto-assignment
- `❌ Failed to send tracking data:` - Connection errors to the server

### 2. Popup Logs

To debug the extension popup (project selection):

1. Right-click on the extension icon in Chrome toolbar
2. Select **"Inspect popup"**
3. The popup must stay open while you inspect it
4. View the console for any errors

**Common issues:**
- `⚠️ Cannot load projects.` - Cannot connect to tracker server
- Failed fetch requests - Server not running or wrong port

### 3. Content Script Logs

To debug the floating toolbar on web pages:

1. Navigate to any website
2. Right-click on the page and select **"Inspect"**
3. Go to the **Console** tab
4. Look for messages from `content.js`

**What you'll see:**
- `❌ Failed to load projects` - Cannot load project list for toolbar

### 4. History Sync Logs

History sync logs appear in the background service worker console:

- `📜 Syncing history from [date] to [date]` - Sync operation started
- `📜 Found X history items to process` - Number of items found
- `✅ History sync complete: X synced, Y failed` - Sync results
- `❌ Failed to sync visit:` - Individual sync errors

## Common Issues and Solutions

### Extension Cannot Connect to Server

**Symptoms:**
- `❌ Failed to send tracking data: Failed to fetch`
- Popup shows "⚠️ Cannot load projects."
- Console shows network errors

**Solution:**
1. Verify the PhpStorm plugin is running
2. Check the server port in extension settings:
   - Right-click extension icon → **Options**
   - Verify "Tracker Server Port" matches the plugin settings (default: `56000`)
3. Test the connection manually:
   ```
   Open: http://localhost:56000/api/projects
   Should return: JSON list of projects
   ```

### Meeting Detection Not Working

**Symptoms:**
- No notification when joining Google Meet
- Meetings not being tracked

**Check:**
1. Open background service worker console
2. Join a Google Meet
3. Look for: `[CodePulse] Google Meet detected!`
4. If missing, the URL detection may be failing

### Project Selection Not Saving

**Symptoms:**
- Selected project doesn't stick
- Badge not showing on extension icon

**Check:**
1. Open background service worker console
2. Select a project in the popup
3. Look for Chrome storage errors
4. Try clearing extension storage:
   ```
   chrome.storage.sync.clear()
   ```
   (Run in background service worker console)

### History Sync Failing

**Symptoms:**
- "Sync Missing History" button shows errors
- `❌ Sync failed: ...` message in popup

**Debug:**
1. Open background service worker console
2. Click "Sync Missing History" button
3. Check console for detailed error messages
4. Verify server is accepting `/url-track` POST requests

## Extension Settings

Access settings by:
1. Right-click extension icon → **Options**
2. Or go to `chrome://extensions/` → Click **"Details"** → **"Extension options"**

**Key Settings:**
- **Tracker Server Port** - Must match the PhpStorm plugin port (default: 56000)
- **Dark Mode** - UI theme preference

## Testing Checklist

When testing the extension, verify:

- [ ] Extension icon appears in Chrome toolbar
- [ ] Popup opens and shows project list
- [ ] Can select a project (badge updates on icon)
- [ ] Background script console shows `[CodePulse]` logs
- [ ] Tab switching is tracked (check console)
- [ ] Google Meet detection works
- [ ] History sync completes successfully
- [ ] Floating toolbar appears on web pages (if enabled)
- [ ] Server connection is stable (no fetch errors)

## Log Levels

The extension uses these log types:

- `console.log()` - Informational messages (prefixed with `[CodePulse]`)
- `console.warn()` - Warnings (prefixed with `❌` or `⚠️`)
- `console.error()` - Errors that need attention

## Server-Side Logs (PhpStorm Plugin)

The PhpStorm plugin has **extensive logging** using `println` statements. These logs go to the IDE's log file.

### How to Access IDE Logs

**Method 1: Via PhpStorm Menu**
1. In PhpStorm, go to **Help** → **Show Log in Finder/Explorer** (or **Show Log in Files** on Linux)
2. Open `idea.log`
3. Search for relevant keywords (see below)

**Method 2: Direct File Access**
The log file location varies by operating system:
- **Linux**: `~/.cache/JetBrains/PhpStorm<version>/log/idea.log`
- **macOS**: `~/Library/Logs/JetBrains/PhpStorm<version>/idea.log`
- **Windows**: `%USERPROFILE%\AppData\Local\JetBrains\PhpStorm<version>\log\idea.log`

### What Logs to Look For

**Server Startup:**
```
🌐 BrowsingTrackerServer started on port 56000
→→→→→→ Opening SQLite DB at /home/user/.cache/phpstorm-time-tracker/tracker.db
→→→→→→ Opened SQLite DB at /home/user/.cache/phpstorm-time-tracker/tracker.db
```

**API Requests:**
```
GET /api/stats
GET /api/projects
POST /api/meeting-patterns/match
PUT /api/urls
DELETE /api/ignored-projects
```

**Time Tracking:**
```
🕒 Added 30 seconds browsing time to project 'my-project' from https://example.com
🕒 Added 60 seconds coding time to project 'my-project', file: /path/to/file.kt
💾 Recorded file save: src/main/file.kt
```

**Git Commits:**
```
📝 Recorded commit: abc123def for project 'my-project' on branch 'main'
✅ Commit recorded successfully
```

**Wrike Integration:**
```
Proxying Wrike API request: https://www.wrike.com/api/v4/contacts?me=true
GET /api/wrike-mappings
POST /api/wrike-mappings
```

**License Validation:**
```
Stored licenseKey = ABC-123-XYZ
Stored isValid   = true
Stored lastCheck = 1234567890
```

**Errors:**
```
❌ Error processing request: <error message>
⚠️ Port already in use. Server may already be running.
Error proxying Wrike API request: <error message>
```

**Daily Sync:**
```
✅ Sync success [200]: <response>
❌ Sync failed: <error message>
```

### Monitoring Logs in Real-Time

**On Linux/macOS:**
```bash
# Follow the log file in real-time
tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log

# Filter for specific patterns
tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log | grep -E "🌐|🕒|❌|GET|POST"
```

**On Windows (PowerShell):**
```powershell
Get-Content $env:USERPROFILE\AppData\Local\JetBrains\PhpStorm*\log\idea.log -Wait -Tail 50
```

### Common Server Issues

**Server Not Starting:**
Look for:
```
⚠️ Port already in use. Server may already be running.
```
**Solution:** Another instance is running. Restart PhpStorm or change the port in Settings.

**Database Issues:**
Look for:
```
→→→→→→ Opening SQLite DB at <path>
→→→→→→ Opened SQLite DB at <path>
```
If these don't appear, the database may be corrupted.

**API Errors:**
Look for:
```
❌ Error processing request: <message>
```
This indicates server-side errors processing Chrome extension requests.

## Getting Help

If you encounter issues:

1. **Collect logs** from both:
   - Chrome extension background service worker console
   - PhpStorm plugin logs (`idea.log`)

2. **Note the issue**:
   - What were you doing when it happened?
   - What error messages appeared?
   - Can you reproduce it consistently?

3. **Check server connectivity**:
   ```bash
   # Test if server is running
   curl http://localhost:56000/api/projects

   # Should return JSON array of projects
   ```

4. **Report the issue** with:
   - Extension version (see `chrome://extensions/`)
   - Chrome version (see `chrome://version/`)
   - PhpStorm version
   - Log excerpts showing the error
   - Steps to reproduce

## Quick Troubleshooting Commands

Run these in the background service worker console (`chrome://extensions/` → Inspect service worker):

```javascript
// Check current storage
chrome.storage.sync.get(null, (items) => console.log(items));

// Check active project
chrome.storage.sync.get('activeProject', (data) => console.log('Active:', data.activeProject));

// Test server connection
fetch('http://localhost:56000/api/projects')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Manually trigger history sync
chrome.runtime.sendMessage({
  action: 'syncHistorySinceLastSync',
  projectName: ''
}, response => console.log(response));
```

## Privacy Note

All logs are stored locally in Chrome's console and are never transmitted externally. The extension only sends URL tracking data to your local PhpStorm plugin server (default: `localhost:56000`).

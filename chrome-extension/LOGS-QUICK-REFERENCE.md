# Logs Quick Reference Guide

Quick reference for finding logs when debugging CodePulse Time Tracker.

## Chrome Extension Logs

### Background Service Worker (Main Extension Logs)
**Where:** Chrome DevTools Console
**How to access:**
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click **"service worker"** under "Code Pulse Browsing Tracker"

**What you'll see:**
```
[CodePulse] Background script initializing...
[CodePulse] Server port loaded: 56000
[CodePulse] Tab URL: https://example.com
[CodePulse] Google Meet detected!
✅ Auto-assigned meeting to project: my-project
❌ Failed to send tracking data: <error>
📜 Syncing history from <date> to <date>
✅ History sync complete: 50 synced, 0 failed
```

### Popup Logs
**Where:** Popup DevTools Console
**How to access:**
1. Right-click extension icon → **Inspect popup**

**What you'll see:**
```
⚠️ Cannot load projects.
(Network errors when connecting to server)
```

### Content Script Logs (Floating Toolbar)
**Where:** Page DevTools Console
**How to access:**
1. Right-click on any webpage → **Inspect**
2. Go to Console tab

**What you'll see:**
```
❌ Failed to load projects
```

## PhpStorm Plugin Logs

### IDE Log File Location

**Linux:**
```
~/.cache/JetBrains/PhpStorm<version>/log/idea.log
```

**macOS:**
```
~/Library/Logs/JetBrains/PhpStorm<version>/log/idea.log
```

**Windows:**
```
%USERPROFILE%\AppData\Local\JetBrains\PhpStorm<version>\log\idea.log
```

**Via PhpStorm Menu:**
```
Help → Show Log in Finder/Explorer
```

### Key Log Messages

**Server Started:**
```
🌐 BrowsingTrackerServer started on port 56000
```

**Database:**
```
→→→→→→ Opening SQLite DB at /path/to/tracker.db
→→→→→→ Opened SQLite DB at /path/to/tracker.db
```

**API Requests from Chrome:**
```
GET /api/projects
GET /api/stats
POST /api/meeting-patterns/match
```

**Time Tracking:**
```
🕒 Added 30 seconds browsing time to project 'my-project' from https://example.com
🕒 Added 60 seconds coding time to project 'my-project', file: /path/to/file.kt
💾 Recorded file save: src/main/file.kt
```

**Git Commits:**
```
📝 Recorded commit: abc123 for project 'my-project' on branch 'main'
✅ Commit recorded successfully
```

**Errors:**
```
❌ Error processing request: <message>
⚠️ Port already in use. Server may already be running.
```

## Quick Debugging Workflow

### Problem: Chrome extension can't load projects

1. **Check Chrome extension console:**
   ```
   chrome://extensions/ → service worker → Console
   ```
   Look for: `❌ Failed to send tracking data`

2. **Check PhpStorm is running:**
   ```
   curl http://localhost:56000/api/projects
   ```
   Should return JSON array

3. **Check IDE logs:**
   ```
   Help → Show Log in Finder/Explorer
   ```
   Look for: `🌐 BrowsingTrackerServer started on port 56000`

### Problem: Time not being tracked

1. **Check extension has project selected:**
   - Extension icon should show badge (e.g., "mypr")

2. **Check background service worker:**
   ```
   chrome://extensions/ → service worker
   ```
   Look for: `[CodePulse] Tab URL: https://...`

3. **Check IDE logs for tracking:**
   ```
   tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log | grep "🕒"
   ```
   Should see: `🕒 Added X seconds browsing time...`

### Problem: Meeting detection not working

1. **Check background service worker:**
   ```
   chrome://extensions/ → service worker
   ```
   Look for: `[CodePulse] Google Meet detected!`

2. **Check IDE logs for pattern matching:**
   ```
   POST /api/meeting-patterns/match
   ```

## Real-Time Log Monitoring

### Monitor Chrome Extension Logs
```
chrome://extensions/ → service worker → Keep console open
```

### Monitor PhpStorm Logs (Linux/macOS)
```bash
# All logs
tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log

# Only important messages
tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log | grep -E "🌐|🕒|❌|📝|GET|POST"

# Only errors
tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log | grep "❌"

# Only tracking
tail -f ~/.cache/JetBrains/PhpStorm*/log/idea.log | grep "🕒"
```

### Monitor PhpStorm Logs (Windows PowerShell)
```powershell
Get-Content $env:USERPROFILE\AppData\Local\JetBrains\PhpStorm*\log\idea.log -Wait -Tail 50
```

## Testing Server Connection

### Test from Command Line
```bash
# Check if server is running
curl http://localhost:56000/api/projects

# Should return:
# [{"name":"project1",...},{"name":"project2",...}]

# Check server stats
curl http://localhost:56000/api/stats

# Should return:
# {"2025-01-20":{"project1":{"duration":3600,...}}}
```

### Test from Browser
```
http://localhost:56000/api/projects
```

### Test from Chrome Extension Console
```javascript
// Run in background service worker console
fetch('http://localhost:56000/api/projects')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## Common Log Patterns to Look For

### Successful Operation
```
Chrome: [CodePulse] Tab URL: https://example.com
IDE:    🕒 Added 30 seconds browsing time to project 'my-project'
```

### Failed Connection
```
Chrome: ❌ Failed to send tracking data: Failed to fetch
IDE:    (no corresponding log - server not receiving request)
```

### Server Not Running
```
Chrome: ❌ Failed to send tracking data: net::ERR_CONNECTION_REFUSED
IDE:    (no server startup message)
```

### Port Conflict
```
IDE: ⚠️ Port already in use. Server may already be running.
```

## Log Collection for Bug Reports

When reporting issues, collect:

1. **Chrome Extension Logs:**
   - Background service worker console (screenshot or copy/paste)
   - Any errors from popup or content script

2. **PhpStorm Plugin Logs:**
   - Last 100 lines from `idea.log`
   - Or filtered by timestamp: last 30 minutes

3. **System Information:**
   - Chrome version: `chrome://version/`
   - PhpStorm version: Help → About
   - Extension version: `chrome://extensions/`

4. **Server Test:**
   - Output of: `curl http://localhost:56000/api/projects`

## Emoji Legend

Server logs use emoji for quick visual scanning:

- 🌐 = Server startup
- 🕒 = Time tracking
- 💾 = File save
- 📝 = Git commit
- 📜 = History sync
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning

## Additional Resources

- [INSTALLATION.md](./INSTALLATION.md) - Installation guide
- [DEBUGGING.md](./DEBUGGING.md) - Detailed debugging guide
- [PRIVACY.md](./PRIVACY.md) - Privacy policy

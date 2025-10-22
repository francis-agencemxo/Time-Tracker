# CodePulse Browsing Tracker - Chrome Extension

A Chrome extension that tracks browsing activity and integrates with the CodePulse Time Tracker PhpStorm plugin.

## Overview

This extension automatically tracks the time you spend on websites and associates it with your CodePulse projects. It features:

- **Automatic Time Tracking** - Tracks active tab URL and duration
- **Project Association** - Link browsing time to specific projects
- **Google Meet Integration** - Automatically detect and assign meetings to projects
- **Floating Toolbar** - Optional on-page toolbar for quick project switching
- **URL Pattern Matching** - Automatically assign websites to projects based on URL patterns

## Documentation

- **[INSTALLATION.md](./INSTALLATION.md)** - Installation and setup guide
- **[DEBUGGING.md](./DEBUGGING.md)** - Comprehensive debugging guide with log locations
- **[LOGS-QUICK-REFERENCE.md](./LOGS-QUICK-REFERENCE.md)** - Quick reference for finding logs
- **[PRIVACY.md](./PRIVACY.md)** - Privacy policy

## Quick Start

### Installation

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `chrome-extension` folder
5. The extension icon should appear in your Chrome toolbar

### Configuration

1. Ensure the PhpStorm CodePulse plugin is running (default port: 56000)
2. Right-click the extension icon → **Options**
3. Verify **Tracker Server Port** matches your PhpStorm plugin settings
4. Click **Save Settings**

### Usage

1. Click the extension icon
2. Select a project from the list
3. Browse the web - time is automatically tracked
4. View your time in the PhpStorm dashboard

## Features

### Project Selection

Click the extension icon to:
- View all your CodePulse projects
- Select an active project (shows as badge on icon)
- Search for projects by name
- Add custom project names

### Google Meet Integration

When you join a Google Meet:
- Extension automatically detects the meeting
- Prompts you to assign it to a project
- Remembers the assignment for future meetings

### Floating Toolbar

Enable **"Show Floating Toolbar"** to:
- See current project on every page
- Quickly switch projects without opening popup
- Minimal, non-intrusive UI

## Architecture

### Extension Components

```
chrome-extension/
├── manifest.json           # Extension configuration
├── background.js          # Service worker (main logic)
├── popup.html/js          # Extension popup UI
├── options.html/js        # Settings page
├── content.js             # Injected into pages (toolbar)
├── toolbar.css            # Toolbar styles
├── meeting-selector.html/js # Meeting assignment UI
└── icon-*.png            # Extension icons
```

### How It Works

1. **Background Service Worker** (`background.js`)
   - Monitors active tab changes
   - Tracks time spent on each URL
   - Sends data to PhpStorm plugin server
   - Detects Google Meet URLs

2. **Popup** (`popup.js`)
   - Displays project list from PhpStorm
   - Allows project selection
   - Stores selection in Chrome storage
   - Updates badge on extension icon

3. **Content Script** (`content.js`)
   - Runs on all web pages
   - Displays floating toolbar (if enabled)
   - Provides quick project switching

### Data Flow

```
User browses web
    ↓
background.js tracks URL + duration
    ↓
Sends POST to http://localhost:56000/url-track
    ↓
PhpStorm plugin receives data
    ↓
Stored in SQLite database
    ↓
Displayed in dashboard
```

## Development

### Testing Changes

After making code changes:

1. Go to `chrome://extensions/`
2. Click the refresh icon (🔄) on the extension
3. Close and reopen any popups to see changes

### Debugging

See [DEBUGGING.md](./DEBUGGING.md) for detailed debugging instructions.

**Quick tips:**
- **Background script logs**: `chrome://extensions/` → Inspect service worker
- **Popup logs**: Right-click icon → Inspect popup
- **Content script logs**: Right-click page → Inspect → Console

### File Changes

**No reload required:**
- None (Chrome extension files are not hot-reloaded)

**Requires extension reload:**
- All `.js`, `.html`, `.css`, and `manifest.json` changes
- Go to `chrome://extensions/` and click refresh icon

**Requires browser restart:**
- Permission changes in `manifest.json` (sometimes)

## API Endpoints

The extension communicates with these PhpStorm plugin endpoints:

### GET Endpoints
- `GET /api/projects` - List all projects
- `GET /api/stats` - Get time tracking statistics
- `GET /api/project-names` - Get custom project names
- `GET /api/meeting-patterns` - Get saved meeting patterns

### POST Endpoints
- `POST /url-track` - Send browsing time data
- `POST /api/meeting-patterns/match` - Check if URL matches a meeting pattern

## Configuration

### Extension Settings

Access via: Right-click icon → **Options**

- **Tracker Server Port** - Port where PhpStorm plugin runs (default: 56000)
- **Dark Mode** - Toggle dark/light theme

### Storage

The extension stores:
- **Active project** - Currently selected project (`chrome.storage.sync`)
- **Server port** - Custom port configuration (`chrome.storage.sync`)
- **Meeting project overrides** - Meeting URL → Project mappings (`chrome.storage.local`)
- **Toolbar preference** - Show/hide floating toolbar (`chrome.storage.sync`)

## Permissions

The extension requires these permissions:

- **tabs** - Access tab information for URL tracking
- **storage** - Store settings and project selection
- **windows** - Manage meeting assignment popups
- **host_permissions: <all_urls>** - Track time on any website

See [PRIVACY.md](./PRIVACY.md) for privacy details.

## Troubleshooting

### Extension not tracking

**Check:**
1. Extension icon shows a badge with project name
2. Background service worker console shows no errors
3. PhpStorm plugin is running: `curl http://localhost:56000/api/projects`

**Solution:**
- Select a project in the extension popup
- Verify server port matches in extension options

### Cannot load projects

**Error:** "⚠️ Cannot load projects."

**Check:**
1. PhpStorm is running with CodePulse plugin active
2. Server port in extension matches plugin settings
3. Test connection: `curl http://localhost:56000/api/projects`

**Solution:**
- Restart PhpStorm
- Update server port in extension options
- Check firewall/antivirus blocking localhost connections

### Meeting detection not working

**Check:**
1. You're on a `meet.google.com` URL
2. Background service worker shows: `[CodePulse] Google Meet detected!`
3. Chrome notifications are enabled

**Solution:**
- Grant notification permissions to Chrome
- Check background service worker console for errors

## Known Issues

- Extension cannot track `chrome://` pages (Chrome security restriction)
- Floating toolbar may conflict with some website layouts

## Privacy

The extension:
- ✅ Only sends data to your local PhpStorm plugin (`localhost`)
- ✅ Does NOT transmit data to external servers
- ✅ Does NOT capture page contents or form data
- ✅ Only tracks: URL, tab title, duration, and project assignment

Full privacy policy: [PRIVACY.md](./PRIVACY.md)

## Version History

**1.7.0.4** (Current)
- Meeting pattern matching
- History sync improvements
- Floating toolbar
- Dark mode support

## Support

### Getting Help

1. Check [DEBUGGING.md](./DEBUGGING.md) for troubleshooting steps
2. Check [LOGS-QUICK-REFERENCE.md](./LOGS-QUICK-REFERENCE.md) for log locations
3. Collect logs from both extension and PhpStorm
4. Report issues with reproduction steps

### Bug Reports

When reporting bugs, include:
- Chrome version: `chrome://version/`
- Extension version: `chrome://extensions/`
- PhpStorm version
- Steps to reproduce
- Logs from:
  - Background service worker console
  - PhpStorm `idea.log`
- Output of: `curl http://localhost:56000/api/projects`

## Contributing

See main repository README for contribution guidelines.

## License

This extension is part of the CodePulse Time Tracker PhpStorm plugin.

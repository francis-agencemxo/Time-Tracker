# Chrome Extension Installation Guide

This guide will help you install and test the CodePulse Browsing Tracker Chrome extension.

## Prerequisites

- Google Chrome browser
- PhpStorm with the CodePulse Time Tracker plugin installed and running
- The plugin should be running on port **56000** (default)

## Installation Steps

### Method 1: Load Unpacked Extension (For Testing)

This is the recommended method for testing the extension during development.

1. **Open Chrome Extensions Page**
   - Navigate to `chrome://extensions/`
   - Or click the three-dot menu → **More tools** → **Extensions**

2. **Enable Developer Mode**
   - Toggle the **"Developer mode"** switch in the top-right corner

3. **Load the Extension**
   - Click **"Load unpacked"** button
   - Navigate to your project folder:
     ```
     /path/to/phpstorm-time-tracker-ui-v7/chrome-extension/
     ```
   - Select the `chrome-extension` folder and click **"Select"**

4. **Verify Installation**
   - You should see "Code Pulse Browsing Tracker" in your extensions list
   - The extension icon should appear in your Chrome toolbar
   - Version should show as **1.7.0.4**

### Method 2: Install Packed Extension (.crx)

If someone provides you with a `.crx` file:

1. Open `chrome://extensions/`
2. Enable **"Developer mode"**
3. Drag and drop the `.crx` file onto the extensions page
4. Click **"Add extension"** when prompted

## Initial Setup

### 1. Configure Server Port

By default, the extension connects to `localhost:56000`. If your PhpStorm plugin uses a different port:

1. Right-click the extension icon → **Options**
2. Update **"Tracker Server Port"** to match your plugin settings
3. Click **"Save Settings"**

### 2. Verify Connection

Test that the extension can connect to the PhpStorm plugin:

1. Click the extension icon in Chrome toolbar
2. You should see a list of your CodePulse projects
3. If you see "⚠️ Cannot load projects", check:
   - PhpStorm is running
   - CodePulse plugin is active
   - Server port matches in both extension and plugin settings

### 3. Select a Project

1. Click the extension icon
2. Choose a project from the list
3. The extension icon should now show a badge with the first 4 letters of the project name

## Features to Test

### Basic Tracking

- [x] **Tab Switching** - Switch between tabs and verify tracking works
- [x] **Project Selection** - Select different projects and verify badge updates
- [x] **Time Tracking** - Browse websites and verify time is sent to server

### Google Meet Integration

- [x] **Meeting Detection** - Join a Google Meet call
- [x] **Project Assignment** - Notification should appear to assign meeting to project
- [x] **Auto-Assignment** - Previously assigned meetings should auto-assign

### Floating Toolbar (Optional)

- [x] **Enable Toolbar** - Check "Show Floating Toolbar" in popup
- [x] **Verify Toolbar** - Visit any website and see floating toolbar

## Troubleshooting

### Extension Not Appearing

**Problem:** Extension icon doesn't show in toolbar

**Solution:**
- Click the puzzle piece icon in Chrome toolbar
- Pin "Code Pulse Browsing Tracker" by clicking the pin icon

### Cannot Load Projects

**Problem:** Popup shows "⚠️ Cannot load projects"

**Solutions:**
1. Verify PhpStorm is running with CodePulse plugin active
2. Check server port in extension options matches plugin settings
3. Test connection manually:
   ```
   http://localhost:56000/api/projects
   ```
   Should return JSON list of projects

### Extension Not Tracking

**Problem:** Time is not being tracked

**Solutions:**
1. Verify a project is selected (badge shows on icon)
2. Check background service worker console for errors:
   - Go to `chrome://extensions/`
   - Click "service worker" under the extension
   - Look for `❌` error messages
3. Verify you're not on a `chrome://` page (cannot be tracked)

### Meeting Detection Not Working

**Problem:** No notification when joining Google Meet

**Solutions:**
1. Verify you're on `meet.google.com/xxx-xxxx-xxx` URL
2. Check background service worker console for:
   ```
   [CodePulse] Google Meet detected!
   ```
3. Ensure notification permissions are granted to Chrome

## Updating the Extension

After code changes:

1. Go to `chrome://extensions/`
2. Find "Code Pulse Browsing Tracker"
3. Click the **refresh icon** (🔄)
4. The extension will reload with your changes

**Note:** You may need to close and reopen the popup to see UI changes.

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions/`
2. Find "Code Pulse Browsing Tracker"
3. Click **"Remove"**
4. Confirm deletion

**Note:** This will delete all stored settings and project selections.

## Extension Files

The extension consists of:

```
chrome-extension/
├── manifest.json           # Extension configuration
├── background.js          # Main tracking logic (service worker)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── options.html          # Settings page
├── options.js            # Settings logic
├── content.js            # Floating toolbar script
├── toolbar.css           # Toolbar styles
├── meeting-selector.html # Meeting project assignment UI
├── meeting-selector.js   # Meeting project assignment logic
└── icon-*.png           # Extension icons
```

## Permissions Explained

The extension requires these permissions:

- **tabs** - Track active tab URL
- **storage** - Save settings and project selection
- **windows** - Manage meeting project selector popups
- **host_permissions: <all_urls>** - Inject toolbar on any website

## Testing Checklist

Before reporting the extension as working:

- [ ] Extension loads without errors
- [ ] Can see project list in popup
- [ ] Can select a project
- [ ] Badge shows on extension icon
- [ ] Tab switching is tracked (verify in PhpStorm dashboard)
- [ ] Google Meet detection works (if applicable)
- [ ] History sync completes successfully
- [ ] Settings can be changed and saved
- [ ] Dark mode toggle works (in Options)

## Getting Help

If you encounter issues:

1. Check the [DEBUGGING.md](./DEBUGGING.md) guide for detailed troubleshooting
2. Collect logs from:
   - Background service worker console (`chrome://extensions/` → Inspect service worker)
   - PhpStorm plugin logs (Help → Show Log)
3. Report issues with:
   - Chrome version (`chrome://version/`)
   - Extension version
   - Steps to reproduce
   - Error messages from logs

## Privacy & Data

The extension:
- ✅ Only sends data to your local PhpStorm plugin (`localhost`)
- ✅ Does NOT transmit data to external servers
- ✅ Does NOT capture page contents or sensitive data
- ✅ Only tracks URL, duration, and project assignment

See [PRIVACY.md](./PRIVACY.md) for full privacy policy.

## Development

For developers working on the extension:

```bash
# Watch for file changes and auto-reload
# Note: You still need to manually refresh in chrome://extensions/

# Test server connection
curl http://localhost:56000/api/projects

# Check background logs in real-time
# chrome://extensions/ → Inspect service worker
```

## Support

For questions or issues:
- Check [DEBUGGING.md](./DEBUGGING.md) for troubleshooting
- Review PhpStorm plugin logs
- Contact the development team with logs and reproduction steps

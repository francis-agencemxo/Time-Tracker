const DEFAULT_PORT = 56000;

document.addEventListener('DOMContentLoaded', () => {
  const portInput = document.getElementById('port');
  const saveButton = document.getElementById('save');
  const resetButton = document.getElementById('reset');
  const status = document.getElementById('status');
  const currentPortDisplay = document.getElementById('current-port-display');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');

  // Load current settings (including dark mode)
  chrome.storage.sync.get({
    trackerServerPort: DEFAULT_PORT,
    darkMode: false
  }, (items) => {
    portInput.value = items.trackerServerPort;
    currentPortDisplay.textContent = items.trackerServerPort;

    // Apply dark mode if saved
    if (items.darkMode) {
      document.body.classList.add('dark-mode');
      themeIcon.textContent = '☀️';
    }
  });

  // Update current port display when input changes
  portInput.addEventListener('input', () => {
    const port = Number(portInput.value);
    if (port >= 1024 && port <= 65535) {
      currentPortDisplay.textContent = port;
    }
  });

  // Save settings
  saveButton.addEventListener('click', () => {
    const port = Number(portInput.value);

    // Validation
    if (!port || port < 1024 || port > 65535) {
      showStatus('Please enter a valid port number (1024-65535)', true);
      return;
    }

    // Save to storage
    chrome.storage.sync.set({ trackerServerPort: port }, () => {
      currentPortDisplay.textContent = port;
      showStatus('✅ Settings saved successfully!');

      // Test connection
      testConnection(port);
    });
  });

  // Reset to default
  resetButton.addEventListener('click', () => {
    portInput.value = DEFAULT_PORT;
    currentPortDisplay.textContent = DEFAULT_PORT;
    chrome.storage.sync.set({ trackerServerPort: DEFAULT_PORT }, () => {
      showStatus('🔄 Reset to default port (56000)');
    });
  });

  // Helper function to show status messages
  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = isError ? 'show error' : 'show';

    setTimeout(() => {
      status.classList.remove('show');
    }, 3000);
  }

  // Test connection to server
  async function testConnection(port) {
    try {
      const response = await fetch(`http://localhost:${port}/api/projects`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        showStatus('✅ Settings saved! Connection successful.');
      } else {
        showStatus(`⚠️ Settings saved, but server returned ${response.status}`, true);
      }
    } catch (error) {
      showStatus('⚠️ Settings saved, but cannot reach server. Make sure PhpStorm is running.', true);
    }
  }

  // Dark mode toggle
  themeToggle.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');

    // Update icon
    themeIcon.textContent = isDarkMode ? '☀️' : '🌙';

    // Save preference
    chrome.storage.sync.set({ darkMode: isDarkMode }, () => {
      console.log('Dark mode preference saved:', isDarkMode);
    });
  });
});
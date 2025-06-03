document.addEventListener('DOMContentLoaded', () => {
  const portInput = document.getElementById('port');
  chrome.storage.sync.get({ trackerServerPort: 56010 }, (items) => {
    portInput.value = items.trackerServerPort;
  });
  document.getElementById('save').addEventListener('click', () => {
    const port = Number(portInput.value);
    if (!port) {
      alert('Please enter a valid port number');
      return;
    }
    chrome.storage.sync.set({ trackerServerPort: port }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      setTimeout(() => {
        status.textContent = '';
      }, 1500);
    });
  });
});
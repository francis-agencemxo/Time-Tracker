let activeProject = null;
let trackerServerPort = 56000;
let allProjects = [];

// DOM elements
const searchInput = document.getElementById("search");
const listElement = document.getElementById("project-list");
const customInput = document.getElementById("custom-project-input");
const toolbarCheckbox = document.getElementById("toggle-toolbar");

// Load settings and fetch projects
(async function () {
  const storage = await chrome.storage.sync.get([
    "activeProject",
    "trackerServerPort",
    "showFloatingToolbar"
  ]);

  activeProject = storage.activeProject || null;
  trackerServerPort = storage.trackerServerPort || 56000;

  toolbarCheckbox.checked = storage.showFloatingToolbar !== false;

  try {
    const [projectsRes, namesRes] = await Promise.all([
      fetch(`http://localhost:${trackerServerPort}/api/projects`),
      fetch(`http://localhost:${trackerServerPort}/api/project-names`)
    ]);

    const projects = await projectsRes.json();
    const customNames = await namesRes.json();

    // Map projectName => customName
    const nameMap = {};
    customNames.forEach(entry => {
      nameMap[entry.projectName] = entry.customName;
    });

    // Merge
    allProjects = projects.map(p => ({
      ...p,
      label: nameMap[p.name] || p.name
    }));

  } catch (e) {
    listElement.innerHTML = "⚠️ Cannot load projects.";
    return;
  }

  renderProjects();

  // Listen to custom entry
  customInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = customInput.value.trim();
      if (!value) return;

      chrome.storage.sync.set({ activeProject: value }, () => {
        activeProject = value;
        updateBadge(value);
        customInput.value = "";
        renderProjects(searchInput.value);
      });
    }
  });
})();

// Renders the filtered + sorted list
function renderProjects(filter = "") {
  listElement.innerHTML = "";

  // Optional "no project" entry
  if (!filter) {
    const noneBtn = document.createElement("div");
    noneBtn.className = "project";
    if (!activeProject) noneBtn.classList.add("active");
    noneBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
           viewBox="0 0 24 24" fill="none" stroke="red"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           class="lucide lucide-ban" style="margin-right:6px;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      </svg>
      No Project
    `;
    noneBtn.title = "Clear active project";
    noneBtn.addEventListener("click", () => {
      chrome.storage.sync.set({ activeProject: null }, () => {
        activeProject = null;
        updateBadge(null);
        renderProjects();
      });
    });
    listElement.appendChild(noneBtn);
  }

  const filtered = allProjects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(project => {
    const btn = document.createElement("div");
    btn.className = "project";
    if (project.name === activeProject) btn.classList.add("active");
    btn.textContent = project.label;

    btn.addEventListener("click", () => {
      chrome.storage.sync.set({ activeProject: project.name }, () => {
        activeProject = project.name;
        updateBadge(project.label);
        renderProjects(filter);
      });
    });

    listElement.appendChild(btn);
  });
}

// Update Chrome badge
function updateBadge(label) {
  if (!label) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeText({ text: label.slice(0, 4).toLowerCase() });
    chrome.action.setBadgeBackgroundColor({ color: "#00BCD4" });
  }
}

// Live search
searchInput.addEventListener("input", () => {
  renderProjects(searchInput.value);
});

// Toolbar toggle checkbox
toolbarCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ showFloatingToolbar: toolbarCheckbox.checked });
});

// History sync button
const syncButton = document.getElementById("sync-history-btn");
const syncStatus = document.getElementById("sync-status");

syncButton.addEventListener("click", async () => {
  syncButton.disabled = true;
  syncButton.textContent = "⏳ Syncing...";
  syncStatus.textContent = "Checking browser history...";

  try {
    // Sync history since last sync
    const response = await chrome.runtime.sendMessage({
      action: 'syncHistorySinceLastSync',
      projectName: activeProject || ''
    });

    if (response.success) {
      const { synced, failed } = response.result;
      syncStatus.textContent = `✅ Synced ${synced} visits${failed > 0 ? `, ${failed} failed` : ''}`;
      syncStatus.style.color = "#4CAF50";

      setTimeout(() => {
        syncStatus.textContent = "";
        syncStatus.style.color = "#999";
      }, 5000);
    } else {
      syncStatus.textContent = `❌ Sync failed: ${response.error}`;
      syncStatus.style.color = "#f44336";
    }
  } catch (error) {
    syncStatus.textContent = `❌ Error: ${error.message}`;
    syncStatus.style.color = "#f44336";
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "📜 Sync Missing History";
  }
});

// Settings button
const settingsButton = document.getElementById("settings-btn");
settingsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

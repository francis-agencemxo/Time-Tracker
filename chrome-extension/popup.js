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
    noneBtn.innerHTML = "🚫 No Project";
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

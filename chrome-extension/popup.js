let activeProject = null;
let trackerServerPort = 56000;
let allProjects = [];

// DOM elements
const searchInput = document.getElementById("search");
const listElement = document.getElementById("project-list");

// Load settings and fetch projects
(async function () {
  const storage = await chrome.storage.sync.get([
    "activeProject",
    "trackerServerPort"
  ]);

  activeProject = storage.activeProject || null;
  trackerServerPort = storage.trackerServerPort || 56000;

  try {
    const [projectsRes, namesRes] = await Promise.all([
      fetch(`http://localhost:${trackerServerPort}/api/projects`),
      fetch(`http://localhost:${trackerServerPort}/api/project-names`)
    ]);

    const projects = await projectsRes.json();
    const customNames = await namesRes.json();

    // Build map: projectName => custoName
    const nameMap = {};
    customNames.forEach(entry => {
      nameMap[entry.projectName] = entry.customName;
    });

    // Merge names into projects
    allProjects = projects.map(p => ({
      ...p,
      label: nameMap[p.name] || p.name  // use customName if available
    }));

  } catch (e) {
    listElement.innerHTML = "⚠️ Cannot load projects.";
    return;
  }

  renderProjects();
})();

// Renders the filtered + sorted list
function renderProjects(filter = "") {
  listElement.innerHTML = "";

  // Optional "no project" entry
  if (!filter) {
    const noneBtn = document.createElement("div");
    noneBtn.className = "project";
    if (!activeProject) noneBtn.classList.add("active");
    noneBtn.innerHTML = "&#x1F6AB; No Project";
    noneBtn.addEventListener("click", () => {
      chrome.storage.sync.set({ activeProject: null }, () => {
        activeProject = null;
        updateBadge(null);
        renderProjects();
      });
    });
    listElement.appendChild(noneBtn);
  }

  // Filtered project list (keep API order)
  const filtered = allProjects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(project => {
    const btn = document.createElement("div");
    btn.className = "project";
    if (project.name === activeProject) btn.classList.add("active");
    btn.textContent = project.name;

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
function updateBadge(projectName) {
  if (!projectName) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeText({ text: projectName.slice(0, 4).toLowerCase() });
    chrome.action.setBadgeBackgroundColor({ color: "#00BCD4" });
  }
}

// Search input live filter
searchInput.addEventListener("input", () => {
  renderProjects(searchInput.value);
});

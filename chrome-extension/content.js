(async function () {

  let {
    showFloatingToolbar = true,
    activeProject,
    toolbarPosition,
    trackerServerPort = 56000,
    floatingToolbarCollapsed = false,
    pinFloatingToolbar = false
  } = await chrome.storage.sync.get([
    "showFloatingToolbar",
    "activeProject",
    "toolbarPosition",
    "trackerServerPort",
    "floatingToolbarCollapsed",
    "pinFloatingToolbar"
  ]);

  if (!showFloatingToolbar || document.getElementById("mxo-toolbar")) return;

  let currentActive = activeProject;
  let collapsed = floatingToolbarCollapsed;

  // Fetch project list
  let projects = [];
  try {
    const res = await fetch(`http://localhost:${trackerServerPort}/api/projects`);
    projects = await res.json();
  } catch (e) {
    console.log("❌ Failed to load projects", e);
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.id = "mxo-toolbar";
  toolbar.style.position = "fixed";
  toolbar.style.top = toolbarPosition?.top ? `${toolbarPosition.top}px` : "100px";
  toolbar.style.left = (toolbarPosition && toolbarPosition.left !== undefined && toolbarPosition.left !== null) ? `${toolbarPosition.left}px` : "auto";
  toolbar.style.right = (!toolbarPosition || toolbarPosition.left === undefined || toolbarPosition.left === null) ? "20px" : "auto";
  toolbar.style.zIndex = "9999";

  const header = document.createElement("div");
  header.id = "mxo-toolbar-header";
  header.innerHTML = `
    <span id="mxo-header-label">CodePulse</span>
    <button id="mxo-pin-toggle" title="Pin toolbar">${pinFloatingToolbar ? "📌" : "📍"}</button>
    <button id="mxo-collapse-toggle">${collapsed ? "▸" : "▾"}</button>
  `;
  toolbar.appendChild(header);

  const searchContainer = document.createElement("div");
  searchContainer.id = "mxo-toolbar-search-container";
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search or create project...";
  searchInput.className = "mxo-toolbar-search";
  searchContainer.appendChild(searchInput);

  const projectList = document.createElement("div");
  projectList.id = "mxo-project-list";
  projectList.style.transition = "max-height 0.3s ease, opacity 0.3s ease";
  projectList.style.overflowY = "auto";
  projectList.style.maxHeight = collapsed ? "0px" : "500px";
  projectList.style.opacity = collapsed ? "0" : "1";
  toolbar.appendChild(searchContainer);
  toolbar.appendChild(projectList);

  let searchQuery = "";

  function ensureProjectExists(projectName) {
    if (!projectName) return;
    const exists = projects.some(
      (project) => project.name.toLowerCase() === projectName.toLowerCase()
    );
    if (!exists) {
      console.log("[Floating Toolbar] Adding placeholder for project:", projectName);
      projects.unshift({ name: projectName });
    }
  }

  function handleProjectSelection(projectName) {
    if (!projectName) return;
    currentActive = projectName;
    chrome.storage.sync.set({ activeProject: projectName });

    // Add project locally if it was created from the search field
    ensureProjectExists(projectName);

    searchQuery = "";
    searchInput.value = "";
    console.log("[Floating Toolbar] Project selected:", projectName);
    renderProjects();
  }

  function renderProjects() {
    ensureProjectExists(currentActive);
    projectList.innerHTML = "";
    let labelText = "CodePulse";

    searchContainer.style.display = collapsed ? "none" : "block";

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredProjects = normalizedQuery
      ? projects.filter((project) =>
          project.name.toLowerCase().includes(normalizedQuery)
        )
      : projects;

    filteredProjects.forEach((project) => {
      const btn = document.createElement("div");
      btn.className = "mxo-toolbar-button";
      if (project.name === currentActive) {
        btn.classList.add("active");
        labelText = project.name;
      }

      // Always include both logo/icon and label for better UX
      if (project.logo) {
        const img = document.createElement("img");
        img.src = project.logo;
        img.alt = project.name;
        img.title = project.name;
        img.className = "mxo-toolbar-logo";
        btn.appendChild(img);
      }

      const span = document.createElement("span");
      span.textContent = project.name;
      span.title = project.name;
      span.className = "mxo-toolbar-label";
      btn.appendChild(span);

      btn.addEventListener("click", () => handleProjectSelection(project.name));

      projectList.appendChild(btn);
    });

    if (
      normalizedQuery &&
      !projects.some(
        (project) => project.name.toLowerCase() === normalizedQuery
      )
    ) {
      const createBtn = document.createElement("div");
      createBtn.className = "mxo-toolbar-button mxo-toolbar-create";

      const span = document.createElement("span");
      span.textContent = `Create "${searchQuery.trim()}"`;
      span.className = "mxo-toolbar-label";
      createBtn.appendChild(span);

      createBtn.addEventListener("click", () => {
        handleProjectSelection(searchQuery.trim());
      });

      projectList.appendChild(createBtn);
    }

    if (!filteredProjects.length && !normalizedQuery) {
      const emptyState = document.createElement("div");
      emptyState.className = "mxo-toolbar-empty";
      emptyState.textContent = "No projects available";
      projectList.appendChild(emptyState);
    }

    const headerLabel = document.getElementById("mxo-header-label");
    if (headerLabel) headerLabel.textContent = collapsed ? labelText : "CodePulse";
  }

  renderProjects();

  document.body.appendChild(toolbar);

  const collapseBtn = document.getElementById("mxo-collapse-toggle");
  const pinBtn = document.getElementById("mxo-pin-toggle");

  // Collapse toggle
  collapseBtn.addEventListener("click", () => {
    collapsed = !collapsed;
    projectList.style.maxHeight = collapsed ? "0px" : "500px";
    projectList.style.opacity = collapsed ? "0" : "1";
    collapseBtn.textContent = collapsed ? "▸" : "▾";
    chrome.storage.sync.set({ floatingToolbarCollapsed: collapsed });
    renderProjects();
  });

  // Pin toggle
  pinBtn.addEventListener("click", () => {
    pinFloatingToolbar = !pinFloatingToolbar;
    chrome.storage.sync.set({ pinFloatingToolbar });
    pinBtn.textContent = pinFloatingToolbar ? "📌" : "📍";
    pinBtn.classList.toggle("pinned", pinFloatingToolbar);
  });

  // Set initial pinned class if already pinned
  if (pinFloatingToolbar) {
    pinBtn.classList.add("pinned");
  }

  // Auto-collapse on mouse leave
  let collapseTimeout;
  toolbar.addEventListener("mouseleave", () => {
    if (!pinFloatingToolbar && !collapsed) {
      collapseTimeout = setTimeout(() => {
        collapsed = true;
        projectList.style.maxHeight = "0px";
        projectList.style.opacity = "0";
        collapseBtn.textContent = "▸";
        chrome.storage.sync.set({ floatingToolbarCollapsed: true });
        renderProjects();
      }, 2000);
    }
  });

  // Cancel auto-collapse on hover
  toolbar.addEventListener("mouseenter", () => {
    if (collapseTimeout) {
      clearTimeout(collapseTimeout);
      collapseTimeout = null;
    }

    if (!pinFloatingToolbar && collapsed) {
      collapsed = false;
      projectList.style.maxHeight = "500px";
      projectList.style.opacity = "1";
      collapseBtn.textContent = "▾";
      chrome.storage.sync.set({ floatingToolbarCollapsed: false });
      renderProjects();
    }
  });

  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    renderProjects();
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const value = searchInput.value.trim();
      if (!value) return;

      const existing = projects.find(
        (project) => project.name.toLowerCase() === value.toLowerCase()
      );
      handleProjectSelection(existing ? existing.name : value);
    }

    if (event.key === "Escape") {
      searchQuery = "";
      searchInput.value = "";
      renderProjects();
    }
  });

  // Sync project change from popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.activeProject) {
      currentActive = changes.activeProject.newValue;
      ensureProjectExists(currentActive);
      console.log("[Floating Toolbar] Active project synced from storage:", currentActive);
      renderProjects();
    }
  });

  // Drag logic (no snap-to-right)
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    offsetX = e.clientX - toolbar.getBoundingClientRect().left;
    offsetY = e.clientY - toolbar.getBoundingClientRect().top;
    toolbar.style.transition = "none";
    header.style.cursor = "move";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    toolbar.style.left = `${e.clientX - offsetX}px`;
    toolbar.style.top = `${e.clientY - offsetY}px`;
    toolbar.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = "";
    toolbar.style.transition = "left 0.3s ease, top 0.3s ease";
    const { top, left } = toolbar.getBoundingClientRect();
    toolbar.style.left = `${left}px`;
    toolbar.style.right = "auto";
    chrome.storage.sync.set({ toolbarPosition: { top, left } });
  });
})();

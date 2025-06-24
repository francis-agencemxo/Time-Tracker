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

  if (!showFloatingToolbar) return;
  if (document.getElementById("mxo-toolbar")) return;

  let currentActive = activeProject;
  let collapsed = floatingToolbarCollapsed;

  // Load projects from local API
  let projects = [];
  try {
    const res = await fetch(`http://localhost:${trackerServerPort}/api/projects`);
    projects = await res.json();
  } catch (e) {
    console.error("❌ Failed to load projects", e);
    return;
  }

  const toolbar = document.createElement("div");
  toolbar.id = "mxo-toolbar";

  const header = document.createElement("div");
  header.id = "mxo-toolbar-header";
  header.innerHTML = `<span id="mxo-header-label">CodePulse</span> <button id="mxo-pin-toggle" title="Pin toolbar">${pinFloatingToolbar ? "📌" : "📍"}</button> <button id="mxo-collapse-toggle">${collapsed ? "▸" : "▾"}</button>`;
  toolbar.appendChild(header);

  const projectList = document.createElement("div");
  projectList.id = "mxo-project-list";
  projectList.style.transition = "max-height 0.3s ease, opacity 0.3s ease";
  projectList.style.overflow = "auto";
  projectList.style.maxHeight = collapsed ? "0px" : "500px";
  projectList.style.opacity = collapsed ? "0" : "1";
  toolbar.appendChild(projectList);

  function renderProjects() {
    projectList.innerHTML = "";
    let labelText = "CodePulse";

    projects.forEach((project) => {
      const btn = document.createElement("div");
      btn.className = "mxo-toolbar-button";
      if (project.name === currentActive) {
        btn.classList.add("active");
        labelText = project.name;
      }

      if (project.logo) {
        const img = document.createElement("img");
        img.src = project.logo;
        img.alt = project.name;
        img.title = project.name;
        img.className = "mxo-toolbar-logo";
        btn.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.textContent = project.name;
        span.title = project.name;
        span.className = "mxo-toolbar-label";
        btn.appendChild(span);
      }

      btn.addEventListener("click", () => {
        chrome.storage.sync.set({ activeProject: project.name });
      });

      projectList.appendChild(btn);
    });

    const headerLabel = document.getElementById("mxo-header-label");
    if (headerLabel) headerLabel.textContent = collapsed ? labelText : "CodePulse";
  }

  renderProjects();

  let collapseTimeout;

  // Auto-collapse on mouse leave (only if not pinned)
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

  // Listen for storage change to sync with popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.activeProject) {
      currentActive = changes.activeProject.newValue;
      renderProjects();
    }
  });

  document.body.appendChild(toolbar);

  // Collapse toggle
  const collapseBtn = document.getElementById("mxo-collapse-toggle");
  collapseBtn.addEventListener("click", () => {
    collapsed = !collapsed;
    projectList.style.maxHeight = collapsed ? "0px" : "500px";
    projectList.style.opacity = collapsed ? "0" : "1";
    collapseBtn.textContent = collapsed ? "▸" : "▾";
    chrome.storage.sync.set({ floatingToolbarCollapsed: collapsed });
    renderProjects();
  });

  // Pin toggle
  const pinBtn = document.getElementById("mxo-pin-toggle");
  pinBtn.addEventListener("click", () => {
    chrome.storage.sync.set({ pinFloatingToolbar: !pinFloatingToolbar });
    pinBtn.textContent = !pinFloatingToolbar ? "📌" : "📍";
    pinFloatingToolbar = !pinFloatingToolbar;
  });

  // Auto-expand on hover (only if not pinned)
  toolbar.addEventListener("mouseenter", () => {
    if (!pinFloatingToolbar && collapsed) {
      collapsed = false;
      projectList.style.maxHeight = "500px";
      projectList.style.opacity = "1";
      collapseBtn.textContent = "▾";
      chrome.storage.sync.set({ floatingToolbarCollapsed: false });
      renderProjects();
    }
  });

  // Drag logic with animation and snap to right
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
    const viewportWidth = window.innerWidth;
    const { top, left, width } = toolbar.getBoundingClientRect();
    let snapToRight = (viewportWidth - left - width) < left;
    snapToRight = false
    if (snapToRight) {
      toolbar.style.left = "auto";
      toolbar.style.right = "20px";
      chrome.storage.sync.set({ toolbarPosition: { top, left: null } });
    } else {
      toolbar.style.left = `${left}px`;
      toolbar.style.right = "auto";
      chrome.storage.sync.set({ toolbarPosition: { top, left } });
    }
  });
})();

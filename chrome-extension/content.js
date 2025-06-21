(async function () {
  if (document.getElementById('mxo-toolbar')) return;

  const {
    activeProject,
    toolbarPosition,
    trackerServerPort = 56000
  } = await chrome.storage.sync.get([
    'activeProject',
    'toolbarPosition',
    'trackerServerPort'
  ]);

  // Load projects from local API
  let allProjects = [];
  try {
    const response = await fetch(`http://localhost:${trackerServerPort}/api/projects`);
    allProjects = await response.json();
  } catch (e) {
    console.error("❌ Failed to load projects from local API", e);
    return;
  }

  // Sort active project to top
  allProjects.sort((a, b) => {
    if (a.name === activeProject) return -1;
    if (b.name === activeProject) return 1;
    return a.name.localeCompare(b.name);
  });

  const toolbar = document.createElement('div');
  toolbar.id = 'mxo-toolbar';
  toolbar.style.position = 'fixed';
  toolbar.style.top = toolbarPosition ? `${toolbarPosition.top}px` : '100px';
  toolbar.style.left = toolbarPosition ? `${toolbarPosition.left}px` : 'auto';
  toolbar.style.right = toolbarPosition ? 'auto' : '20px';
  toolbar.style.zIndex = '9999';

  // Header row
  const header = document.createElement('div');
  header.id = 'mxo-toolbar-header';
  header.innerHTML = `<span>CodePulse</span> <button id="mxo-collapse-toggle">▾</button>`;
  toolbar.appendChild(header);

  // Search bar
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = 'Search...';
  search.id = 'mxo-toolbar-search';
  toolbar.appendChild(search);

  // Scrollable list container
  const projectList = document.createElement('div');
  projectList.id = 'mxo-project-list';
  toolbar.appendChild(projectList);

  // Add project buttons
  function renderProjects(filter = '') {
    projectList.innerHTML = ''; // Clear list

    const filtered = allProjects.filter(p =>
      p.name.toLowerCase().includes(filter.toLowerCase())
    );

    filtered.forEach((project) => {
      const btn = document.createElement('div');
      btn.className = 'mxo-toolbar-button';
      if (project.name === activeProject) btn.classList.add('active');

      if (project.logo) {
        const img = document.createElement('img');
        img.src = project.logo;
        img.alt = project.name;
        img.title = project.name;
        img.className = 'mxo-toolbar-logo';
        btn.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.textContent = project.name;
        span.title = project.name;
        span.className = 'mxo-toolbar-label';
        btn.appendChild(span);
      }

      btn.addEventListener('click', () => {
        chrome.storage.sync.set({ activeProject: project.name });
        document.querySelectorAll('.mxo-toolbar-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects(search.value); // re-render to re-pin
      });

      projectList.appendChild(btn);
    });
  }

  renderProjects();

  // Live search
  search.addEventListener('input', () => {
    renderProjects(search.value);
  });

  // Collapse toggle
  let collapsed = false;
  document.getElementById('mxo-collapse-toggle').addEventListener('click', () => {
    collapsed = !collapsed;
    projectList.style.display = collapsed ? 'none' : 'block';
    search.style.display = collapsed ? 'none' : 'block';
    document.getElementById('mxo-collapse-toggle').textContent = collapsed ? '▸' : '▾';

    // When collapsed, show only active project at top
    if (collapsed) {
      const activeOnly = allProjects.filter(p => p.name === activeProject);
      allProjects = activeOnly.concat(allProjects.filter(p => p.name !== activeProject));
      renderProjects('');
    }
  });

  document.body.appendChild(toolbar);

  // Drag logic
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - toolbar.getBoundingClientRect().left;
    offsetY = e.clientY - toolbar.getBoundingClientRect().top;
    header.style.cursor = 'move';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    toolbar.style.left = `${e.clientX - offsetX}px`;
    toolbar.style.top = `${e.clientY - offsetY}px`;
    toolbar.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    header.style.cursor = '';
    const { top, left } = toolbar.getBoundingClientRect();
    chrome.storage.sync.set({ toolbarPosition: { top, left } });
  });
})();

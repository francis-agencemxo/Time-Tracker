let selectedProject = null;
let meetingUrl = null;
let trackerServerPort = 56000;
(async function init() {
  // Get the notification ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const notificationId = urlParams.get('notificationId');

    if (!notificationId) {
        showError('Invalid meeting session');
        return;
    }

    // Get meeting data from storage
    const data = await chrome.storage.local.get([notificationId]);
    const storageData = await chrome.storage.sync.get(['trackerServerPort']);
    const meetingData = data[notificationId];
    trackerServerPort = storageData.trackerServerPort || 56000;

    if (!meetingData) {
        showError('Meeting session not found');
        return;
    }

    meetingUrl = meetingData.url;
    console.log('[Meeting Selector] Initializing meeting selector', { notificationId, meetingUrl });

    // Fetch projects from the server
    try {
        await loadAndRenderProjects(notificationId);

    } catch (error) {
        console.error('Failed to load projects:', error);
        showError('Failed to load projects. Please make sure the tracker is running.');
    }
})();

async function loadAndRenderProjects(notificationId) {
    try {
        const [projectsRes, namesRes] = await Promise.all([
            fetch(`http://localhost:${trackerServerPort}/api/projects`),
            fetch(`http://localhost:${trackerServerPort}/api/project-names`)
        ]);

        const projects = await projectsRes.json();
        const customNames = await namesRes.json();

        const allProjects = projects.map(p => ({
            name: p.name,
            label: customNames.find(entry => entry.projectName === p.name)?.customName || p.name
        }));

        const activeStorage = await chrome.storage.sync.get('activeProject');
        const activeProject = activeStorage.activeProject || null;
        renderProjectSelector(allProjects, notificationId, activeProject);
    } catch (error) {
        console.error('[Meeting Selector] Failed to load projects:', error);
        showError('Failed to load projects. Please make sure the tracker is running.');
    }
}

function renderProjectSelector(projects, notificationId, activeProjectFromSync) {
  const content = document.getElementById('content');

  content.innerHTML = `
    <input type="text" class="search-box" id="search" placeholder="🔍 Search projects...">
    <div class="project-list" id="project-list"></div>
    <div class="button-group">
      <button class="btn-primary" id="confirm-btn" disabled>Assign Project</button>
    </div>
  `;

  const searchInput = document.getElementById('search');
  const projectList = document.getElementById('project-list');
  const confirmButton = document.getElementById('confirm-btn');

    if (activeProjectFromSync) {
        selectedProject = activeProjectFromSync;
        console.log('[Meeting Selector] Active project from sync', activeProjectFromSync);
    }

    function highlightSelectedProject() {
        const items = projectList.querySelectorAll('.project-item');
        items.forEach((item) => {
            const itemProject = item.dataset.projectName || null;
            if (selectedProject && itemProject === selectedProject) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        confirmButton.disabled = !selectedProject;
    }

    function renderProjects(filter = '') {
        projectList.innerHTML = '';

        // Filter and render projects
        const filtered = projects.filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.label.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(project => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.innerHTML = `<span class="project-icon">📁</span><span>${project.label}</span>`;
            div.dataset.projectName = project.name;
            div.addEventListener('click', () => selectProject(project.name, div));
            projectList.appendChild(div);
        });

        const trimmedFilter = filter.trim();

        if (!filtered.length && trimmedFilter) {
            const createDiv = document.createElement('div');
            createDiv.className = 'project-item create-option';
            createDiv.innerHTML = `<span class="project-icon">✨</span><span>Create "${trimmedFilter}"</span>`;
            createDiv.dataset.projectName = trimmedFilter;
            createDiv.addEventListener('click', () => selectProject(trimmedFilter, createDiv));
            projectList.appendChild(createDiv);

            const infoDiv = document.createElement('div');
            infoDiv.style.textAlign = 'center';
            infoDiv.style.padding = '12px';
            infoDiv.style.color = '#999';
            infoDiv.style.fontSize = '12px';
            infoDiv.textContent = 'Press Enter or click to create a new project';
            projectList.appendChild(infoDiv);
        } else if (!filtered.length) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.padding = '20px';
            emptyDiv.style.color = '#999';
            emptyDiv.textContent = 'No projects available';
            projectList.appendChild(emptyDiv);
        }

        highlightSelectedProject();
    }

    confirmButton.addEventListener('click', () => confirmSelection(notificationId));

    function selectProject(projectName, element) {
        if (!projectName) return;

        selectedProject = projectName;
        console.log('[Meeting Selector] Project selected', selectedProject);

        // Remove selected class from all items
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selected class to clicked item if available
        if (element) {
            element.classList.add('selected');
        }

        // Enable confirm button
        highlightSelectedProject();
    }

    searchInput.addEventListener('input', (e) => {
        renderProjects(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const value = e.target.value.trim();
            if (!value) return;
            selectProject(value, null);
            confirmSelection(notificationId);
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            searchInput.value = '';
            renderProjects('');
        }
    });

    renderProjects();
    searchInput.focus();
}

async function confirmSelection(notificationId) {
    if (!selectedProject) return;

    console.log('[Meeting Selector] Confirming selection', selectedProject);

    try {
        // Send message to background script to set the meeting project
        const response = await chrome.runtime.sendMessage({
            action: 'setMeetingProject',
            url: meetingUrl,
            projectName: selectedProject,
            selectionId: notificationId
        });

        if (!response || response.success !== true) {
            throw new Error(response?.error || 'Background script did not ack selection');
        }
        console.log('[Meeting Selector] Background acknowledged selection', response);

    // Clean up the storage
    await chrome.storage.local.remove(notificationId);
    console.log('[Meeting Selector] Selection complete, storage entry removed');

    window.close();
    return;

  } catch (error) {
    console.error('Failed to set meeting project:', error);
    showError('Failed to assign project');
  }
}

function extractMeetingPattern(url) {
    // Extract the unique meeting ID from Google Meet URL
    // Example: https://meet.google.com/abc-defg-hij → abc-defg-hij
    const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
    if (match) {
        return match[1]; // Return just the meeting code
    }
    // Fallback to full URL if pattern doesn't match
    return url;
}

function closeWindow() {
    window.close();
}

function showError(message) {
  const content = document.getElementById('content');
  content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <h2 style="color: #f44336; margin-bottom: 10px;">Error</h2>
            <p style="color: #666;">${message}</p>
            <button class="btn-primary" id="error-close-btn" style="margin-top: 20px; width: 100%;">Close</button>
        </div>
    `;

    const closeBtn = document.getElementById('error-close-btn');
    closeBtn.addEventListener('click', closeWindow);
}

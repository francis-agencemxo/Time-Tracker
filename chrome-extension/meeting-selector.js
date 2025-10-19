let selectedProject = null;
let meetingUrl = null;
let trackerServerPort = 56000;
let rememberMeeting = false;

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

    // Fetch projects from the server
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
        const allProjects = projects.map(p => ({
            name: p.name,
            label: nameMap[p.name] || p.name
        }));

        renderProjectSelector(allProjects, notificationId);

    } catch (error) {
        console.error('Failed to load projects:', error);
        showError('Failed to load projects. Please make sure the tracker is running.');
    }
})();

function renderProjectSelector(projects, notificationId) {
    const content = document.getElementById('content');

    content.innerHTML = `
        <input type="text" class="search-box" id="search" placeholder="🔍 Search projects...">
        <div class="project-list" id="project-list"></div>
        <div class="remember-checkbox">
            <input type="checkbox" id="remember-checkbox">
            <label for="remember-checkbox">
                💾 Remember this meeting for future sessions
            </label>
        </div>
        <div class="button-group">
            <button class="btn-secondary" onclick="closeWindow()">Cancel</button>
            <button class="btn-primary" id="confirm-btn" disabled onclick="confirmSelection('${notificationId}')">Assign Project</button>
        </div>
    `;

    const searchInput = document.getElementById('search');
    const projectList = document.getElementById('project-list');
    const rememberCheckbox = document.getElementById('remember-checkbox');

    // Track checkbox state
    rememberCheckbox.addEventListener('change', (e) => {
        rememberMeeting = e.target.checked;
    });

    function renderProjects(filter = '') {
        projectList.innerHTML = '';

        // Add "No Project" option
        const noProjectDiv = document.createElement('div');
        noProjectDiv.className = 'project-item no-project-option';
        noProjectDiv.innerHTML = '<span class="project-icon">🚫</span><span>No Project (Skip tracking)</span>';
        noProjectDiv.onclick = () => selectProject(null, noProjectDiv);
        projectList.appendChild(noProjectDiv);

        // Filter and render projects
        const filtered = projects.filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.label.toLowerCase().includes(filter.toLowerCase())
        );

        filtered.forEach(project => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.innerHTML = `<span class="project-icon">📁</span><span>${project.label}</span>`;
            div.onclick = () => selectProject(project.name, div);
            projectList.appendChild(div);
        });

        if (filtered.length === 0 && filter) {
            projectList.innerHTML += '<div style="text-align: center; padding: 20px; color: #999;">No projects found</div>';
        }
    }

    function selectProject(projectName, element) {
        selectedProject = projectName;

        // Remove selected class from all items
        document.querySelectorAll('.project-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selected class to clicked item
        element.classList.add('selected');

        // Enable confirm button
        document.getElementById('confirm-btn').disabled = false;
    }

    searchInput.addEventListener('input', (e) => {
        renderProjects(e.target.value);
    });

    renderProjects();
    searchInput.focus();
}

async function confirmSelection(notificationId) {
    if (selectedProject === undefined) return;

    try {
        // Send message to background script to set the meeting project
        await chrome.runtime.sendMessage({
            action: 'setMeetingProject',
            url: meetingUrl,
            projectName: selectedProject
        });

        // If "Remember" is checked, save the pattern to the backend
        if (rememberMeeting && selectedProject !== null) {
            const storageData = await chrome.storage.sync.get(['trackerServerPort']);
            const port = storageData.trackerServerPort || 56000;

            // Extract the meeting ID from the URL (e.g., meet.google.com/abc-defg-hij)
            const urlPattern = extractMeetingPattern(meetingUrl);

            await fetch(`http://localhost:${port}/api/meeting-patterns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: selectedProject,
                    urlPattern: urlPattern,
                    meetingTitle: `Google Meet - ${urlPattern}`,
                    autoAssign: true
                })
            });

            console.log(`✅ Saved meeting pattern: ${urlPattern} → ${selectedProject}`);
        }

        // Clean up the storage
        await chrome.storage.local.remove(notificationId);

        // Show success message
        showSuccess();

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

function showSuccess() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
            <h2 style="color: #4CAF50; margin-bottom: 10px;">Project Assigned!</h2>
            <p style="color: #666;">This meeting is now being tracked${selectedProject ? ` under "${selectedProject}"` : ' (no project)'}.</p>
            <button class="btn-primary" onclick="closeWindow()" style="margin-top: 20px; width: 100%;">Close</button>
        </div>
    `;

    // Auto-close after 2 seconds
    setTimeout(() => {
        window.close();
    }, 2000);
}

function showError(message) {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <h2 style="color: #f44336; margin-bottom: 10px;">Error</h2>
            <p style="color: #666;">${message}</p>
            <button class="btn-primary" onclick="closeWindow()" style="margin-top: 20px; width: 100%;">Close</button>
        </div>
    `;
}

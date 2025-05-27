
let weekOffset = 0;
let dayOffset = 0;
let allStats = {};
let weeklyChart = null;

function getDateString(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function getWeekRange(offset) {
  const now = new Date();
  now.setDate(now.getDate() + offset * 7);
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1); // Monday
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push(d.toISOString().slice(0, 10));
  }
  return week;
}

function updateWeeklyChart() {
  const week = getWeekRange(weekOffset);
  document.getElementById("weekLabel").textContent = `${week[0]} to ${week[6]}`;
  renderWeeklyChart(week, allStats);
}

function updateDailyDetails() {
  const date = getDateString(dayOffset);
  document.getElementById("dayLabel").textContent = date;
  const dailyDetails = document.getElementById("dailyDetails");
  dailyDetails.innerHTML = "";
  const dayData = allStats[date] || {};
  for (const [project, info] of Object.entries(dayData)) {
    const { duration, sessions } = info;
    const mins = Math.floor(duration / 60);

    const merged = mergeSessions(sessions);

    const wrapper = document.createElement("div");
    const labelRow = document.createElement("div");
    labelRow.className = "flex justify-between text-sm font-medium";
    labelRow.innerHTML = `<span>${project}</span><span>${mins} min</span>`;
    wrapper.appendChild(labelRow);

    const timeline = document.createElement("div");
    timeline.className = "relative h-3 bg-gray-200 rounded overflow-hidden";

    merged.forEach(sess => {
      const start = new Date(sess.start);
      const end = new Date(sess.end);
      const startSec = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
      const duration = (end - start) / 1000;
      const left = (startSec / 86400) * 100;
      const width = (duration / 86400) * 100;

      const bar = document.createElement("div");
      bar.className = "absolute h-full rounded";
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      bar.title = `${sess.type} from ${start.toLocaleTimeString()} to ${end.toLocaleTimeString()}`;
      bar.classList.add(sess.type === "browsing" ? "bg-orange-400" : "bg-blue-500");

      timeline.appendChild(bar);
    });

    wrapper.appendChild(timeline);
    dailyDetails.appendChild(wrapper);
  }
}

document.getElementById("weekPrev").addEventListener("click", () => {
  weekOffset--;
  updateWeeklyChart();
});
document.getElementById("weekNext").addEventListener("click", () => {
  weekOffset++;
  updateWeeklyChart();
});
document.getElementById("dayPrev").addEventListener("click", () => {
  dayOffset--;
  updateDailyDetails();
});
document.getElementById("dayNext").addEventListener("click", () => {
  dayOffset++;
  updateDailyDetails();
});

fetch("/api/stats")
  .then(res => res.json())
  .then(json => {
    allStats = json;
    updateWeeklyChart();
    updateDailyDetails();
  });

function mergeSessions(sessions, gapThresholdMinutes = 5, ignoreType = true) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => new Date(a.start) - new Date(b.start));
  const merged = [];

  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(current.end);
    const nextStart = new Date(sorted[i].start);
    const gap = (nextStart - prevEnd) / 60000; // minutes

    if (gap <= gapThresholdMinutes) {
      current.end = sorted[i].end; // merge by extending end
    } else {
      merged.push(current);
      current = { ...sorted[i] };
    }
  }

  merged.push(current);
  return merged;
}

function renderWeeklyChart(weekDates, stats) {
  const dayLabels = weekDates;
  const projectSet = new Set();
  weekDates.forEach(date => {
    const dayData = stats[date] || {};
    Object.keys(dayData).forEach(proj => projectSet.add(proj));
  });
  const projects = Array.from(projectSet).sort();
  const datasets = projects.map((project, i) => {
    const data = weekDates.map(date => {
      const projData = stats[date]?.[project];
      const rawSecs = projData?.duration || 0;

      const merged = mergeSessions(projData?.sessions || []);
      const mergedSeconds = merged.reduce((sum, sess) => {
        const start = new Date(sess.start);
        const end = new Date(sess.end);
        return sum + (end - start) / 1000;
      }, 0);
      return parseFloat((mergedSeconds / 3600).toFixed(2));
    });
    const color = getColorForIndex(i);
    return {
      label: project,
      data,
      backgroundColor: color,
      borderColor: 'rgba(0,0,0,0.1)',
      borderWidth: 1
    };
  });
  const ctx = document.getElementById("weeklyChart").getContext("2d");
  if (weeklyChart) {
    weeklyChart.data.labels = dayLabels;
    weeklyChart.data.datasets = datasets;
    weeklyChart.update();
  } else {
    weeklyChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: dayLabels, datasets },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const hoursFloat = context.raw;
                const h = Math.floor(hoursFloat);
                const m = Math.round((hoursFloat - h) * 60);
                return `${context.dataset.label}: ${h}h${m.toString().padStart(2, '0')}`;
              }
            }
          },
          legend: { position: 'top' }
        },
        scales: {
          x: { stacked: true },
          y: {
            title: { display: true, text: 'Hours' },
            beginAtZero: true,
            stacked: true,
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}

function getColorForIndex(i) {
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e', '#6366f1'];
  return colors[i % colors.length];
}
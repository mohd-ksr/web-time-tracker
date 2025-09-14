const statsEl = document.getElementById("stats");
const refreshBtn = document.getElementById("refresh");
const resetBtn = document.getElementById("reset");
const toggleBtn = document.getElementById("toggle");
const exportBtn = document.getElementById("export");

let tracking = true;

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs}s`;
}
function loadData() {
  chrome.runtime.sendMessage({ action: "getData" }, usage => {
    statsEl.innerHTML = "";
    const entries = Object.entries(usage).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) return;

    const totalTime = entries.reduce((sum, [_, time]) => sum + time, 0);
    const maxTime = Math.max(...entries.map(([_, time]) => time));

    for (const [domain, time] of entries) {
      const li = document.createElement("li");

      // Domain and time text
      const textSpan = document.createElement("span");
      const percentOfTotal = ((time / totalTime) * 100).toFixed(1);
      textSpan.textContent = `${domain}: ${formatTime(time)} (${percentOfTotal}%)`;

      // Progress bar
      const bar = document.createElement("div");
      bar.className = "progress-bar";
      const percentWidth = (time / maxTime) * 100;
      bar.style.width = percentWidth + "%";

      // Color coding
      const minutes = time / 60000;
      if (minutes > 60) bar.style.background = "rgba(244, 67, 54, 0.4)"; // red
      else if (minutes >= 30) bar.style.background = "rgba(255, 193, 7, 0.4)"; // yellow
      else bar.style.background = "rgba(76, 175, 80, 0.4)"; // green

      li.appendChild(textSpan);
      li.appendChild(bar);
      statsEl.appendChild(li);
    }
  });
}



// Refresh
refreshBtn.addEventListener("click", loadData);

// Reset
resetBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "reset" });
  loadData();
});

// Pause/Resume tracking
toggleBtn.addEventListener("click", () => {
  tracking = !tracking;
  toggleBtn.textContent = tracking ? "Pause" : "Resume";
  chrome.runtime.sendMessage({ action: "toggleTracking", enabled: tracking });
});

// Manual Export CSV
exportBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "generateCSV" }, result => {
    if (!result || !result.csv) {
      alert("No data to export.");
      return;
    }

    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("CSV exported successfully!");
  });
});

// Load data initially
loadData();

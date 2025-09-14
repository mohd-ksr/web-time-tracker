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
    for (const [domain, time] of entries) {
      const li = document.createElement("li");
      li.textContent = `${domain}: ${formatTime(time)}`;
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

// Export CSV
exportBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "getData" }, usage => {
    if (!usage || Object.keys(usage).length === 0) {
      alert("No data to export.");
      return;
    }

    let csv = "Domain,Time (minutes)\n";
    for (const [domain, time] of Object.entries(usage)) {
      csv += `${domain},${(time / 60000).toFixed(2)}\n`;
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "time-tracker.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
});

// Load data initially
loadData();

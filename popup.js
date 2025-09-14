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

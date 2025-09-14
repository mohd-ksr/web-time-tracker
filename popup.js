const statsEl = document.getElementById("stats");
const refreshBtn = document.getElementById("refresh");
const resetBtn = document.getElementById("reset");
const toggleBtn = document.getElementById("toggle");

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

refreshBtn.addEventListener("click", loadData);

resetBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "reset" });
  loadData();
});

toggleBtn.addEventListener("click", () => {
  tracking = !tracking;
  toggleBtn.textContent = tracking ? "Pause" : "Resume";
  chrome.runtime.sendMessage({ action: "toggleTracking", enabled: tracking });
});

loadData();

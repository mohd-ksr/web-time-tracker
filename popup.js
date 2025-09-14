// popup.js - Simple canvas pie chart (top 4 + Other) + controls
const statsEl = document.getElementById("stats");
const refreshBtn = document.getElementById("refresh");
const resetBtn = document.getElementById("reset");
const toggleBtn = document.getElementById("toggle");
const exportBtn = document.getElementById("export");
const canvas = document.getElementById("usageChart");
const legendEl = document.getElementById("legend");

let tracking = true;

// Colors for slices
const COLORS = ["#42a5f5", "#66bb6a", "#ffca28", "#ef5350", "#9e9e9e"];

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h>0) return `${h}h ${m}m ${s}s`;
  if (m>0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Draw pie chart on canvas. labels: array of strings, values: array of numbers (ms)
function drawPieChart(canvas, labels, values, colors) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  // Scale for crispness on high-DPI screens
  const cw = canvas.clientWidth || 280;
  const ch = canvas.clientHeight || 280;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale canvas drawing operations by DPR

  // Clear
  ctx.clearRect(0, 0, cw, ch);

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) {
    // nothing to draw
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#666";
    ctx.textAlign = "center";
    ctx.fillText("No data to show", cw / 2, ch / 2);
    return;
  }

  const cx = cw / 2;
  const cy = ch / 2;
  const radius = Math.min(cw, ch) * 0.38;

  let startAngle = -Math.PI / 2; // start at top
  for (let i = 0; i < values.length; i++) {
    const slice = values[i];
    const sliceAngle = (slice / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length] || "#ccc";
    ctx.fill();

    // small separation line
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    startAngle += sliceAngle;
  }

  // Draw inner circle for donut effect (optional)
  const donut = Math.min(cw, ch) * 0.18;
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(cx, cy, donut, 0, Math.PI * 2);
  ctx.fill();

  // center text total minutes
  const minutesTotal = (total / 60000);
  ctx.fillStyle = "#333";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${minutesTotal.toFixed(1)} min`, cx, cy + 5);
}

// Build legend DOM (colored squares + label + percent)
function buildLegend(container, labels, values, totalMs) {
  container.innerHTML = "";
  labels.forEach((lab, idx) => {
    const ms = values[idx];
    const pct = totalMs === 0 ? 0 : (ms / totalMs) * 100;
    const row = document.createElement("div");
    row.className = "legend-row";

    const colorBox = document.createElement("span");
    colorBox.className = "legend-color";
    colorBox.style.background = COLORS[idx % COLORS.length];

    const labelText = document.createElement("span");
    labelText.className = "legend-text";
    labelText.textContent = `${lab} — ${pct.toFixed(1)}%`;

    row.appendChild(colorBox);
    row.appendChild(labelText);
    container.appendChild(row);
  });
}

// Main loader: get usage from background and render list + pie
function loadData() {
  chrome.runtime.sendMessage({ action: "getData" }, usage => {
    usage = usage || {};
    // Convert to entries and sort descending
    const entries = Object.entries(usage).sort((a, b) => b[1] - a[1]);
    statsEl.innerHTML = "";

    if (entries.length === 0) {
      statsEl.textContent = "No data yet.";
      // clear chart & legend
      drawPieChart(canvas, [], [], COLORS);
      legendEl.innerHTML = "";
      return;
    }

    const totalMs = entries.reduce((s, [, ms]) => s + ms, 0);

    // Prepare top 4 + Other
    const top = entries.slice(0, 4);
    const other = entries.slice(4);
    const otherSum = other.reduce((s, [, ms]) => s + ms, 0);

    const pieLabels = top.map(e => e[0]);
    const pieValues = top.map(e => e[1]);
    if (otherSum > 0) {
      pieLabels.push("Other");
      pieValues.push(otherSum);
    }

    // Render list with progress bars (detailed list)
    const maxMs = Math.max(...entries.map(([,ms]) => ms));
    for (const [domain, ms] of entries) {
      const li = document.createElement("li");
      const textSpan = document.createElement("span");
      const percentOfTotal = totalMs === 0 ? 0 : ((ms / totalMs) * 100);
      textSpan.textContent = `${domain}: ${formatTime(ms)} (${percentOfTotal.toFixed(1)}%)`;

      const bar = document.createElement("div");
      bar.className = "progress-bar";
      const w = maxMs === 0 ? 0 : (ms / maxMs) * 100;
      bar.style.width = w + "%";

      // color by minutes
      const minutes = ms / 60000;
      if (minutes > 60) bar.style.background = "rgba(244,67,54,0.35)";
      else if (minutes >= 30) bar.style.background = "rgba(255,193,7,0.35)";
      else bar.style.background = "rgba(76,175,80,0.35)";

      li.appendChild(textSpan);
      li.appendChild(bar);
      statsEl.appendChild(li);
    }

    // Draw pie chart (values are ms; draw function handles ms)
    drawPieChart(canvas, pieLabels, pieValues, COLORS);

    // Build legend (percentages)
    buildLegend(legendEl, pieLabels, pieValues, totalMs);
  });
}

// Buttons
refreshBtn.addEventListener("click", loadData);

resetBtn.addEventListener("click", () => {
  if (!confirm("Reset all tracked data?")) return;
  chrome.runtime.sendMessage({ action: "reset" });
  loadData();
});

toggleBtn.addEventListener("click", () => {
  tracking = !tracking;
  toggleBtn.textContent = tracking ? "Pause" : "Resume";
  chrome.runtime.sendMessage({ action: "toggleTracking", enabled: tracking });
});

// Manual export (popup handles download)
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

// initial load
// Ensure canvas has a reasonable size via CSS; then request data.
loadData();

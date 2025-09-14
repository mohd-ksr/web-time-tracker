let activeTabId = null;
let activeDomain = null;
let lastActiveTime = Date.now();
let trackingEnabled = true;

// Track tab switches
chrome.tabs.onActivated.addListener(activeInfo => {
  switchTab(activeInfo.tabId);
});

// Track URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    switchTab(tabId);
  }
});

// Heartbeat: record every 5 seconds
setInterval(() => {
  if (!trackingEnabled || !activeDomain) return;
  const now = Date.now();
  const duration = now - lastActiveTime;
  saveTime(activeDomain, duration);
  lastActiveTime = now;
}, 5000);

function switchTab(tabId) {
  const now = Date.now();
  if (activeDomain) {
    const duration = now - lastActiveTime;
    saveTime(activeDomain, duration);
  }
  chrome.tabs.get(tabId, tab => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;
    activeTabId = tabId;
    activeDomain = extractDomain(tab.url);
    lastActiveTime = now;
  });
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "");
  } catch {
    return null;
  }
}

function saveTime(domain, duration) {
  chrome.storage.local.get(["usage"], data => {
    let usage = data.usage || {};
    usage[domain] = (usage[domain] || 0) + duration;
    chrome.storage.local.set({ usage });
  });
}

// Function to generate CSV content
function generateCSVContent(resetAfter=false, callback) {
  chrome.storage.local.get(["usage"], data => {
    const usage = data.usage || {};
    if (Object.keys(usage).length === 0) {
      if (callback) callback(null);
      return;
    }

    const today = new Date();
    const filename = `time-tracker-${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}.csv`;

    let csv = "Domain,Time (minutes)\n";
    for (const [domain, time] of Object.entries(usage)) {
      csv += `${domain},${(time / 60000).toFixed(2)}\n`;
    }

    if (resetAfter) {
      chrome.storage.local.set({ usage: {} });
    }

    if (callback) callback({ csv, filename });
  });
}

// Automatic daily export at midnight
function exportCSVAndReset() {
  generateCSVContent(true, ({ csv, filename }) => {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// Schedule daily export
function scheduleNextExport() {
  const now = new Date();
  const next = new Date();
  next.setHours(24,0,0,0); // next midnight
  const delay = next - now;
  setTimeout(() => {
    exportCSVAndReset();
    scheduleNextExport();
  }, delay);
}

// Initialize daily export
chrome.runtime.onStartup.addListener(() => scheduleNextExport());
chrome.runtime.onInstalled.addListener(() => scheduleNextExport());

// Messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getData") {
    chrome.storage.local.get(["usage"], data => {
      sendResponse(data.usage || {});
    });
    return true;
  }

  if (msg.action === "reset") {
    chrome.storage.local.set({ usage: {} });
    return true;
  }

  if (msg.action === "toggleTracking") {
    trackingEnabled = msg.enabled;
    return true;
  }

  // Manual export request
  if (msg.action === "generateCSV") {
    generateCSVContent(false, result => sendResponse(result));
    return true; // async
  }
});

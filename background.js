let activeTabId = null;
let activeDomain = null;
let lastActiveTime = Date.now();
let trackingEnabled = true;

// Track when user switches tab
chrome.tabs.onActivated.addListener(activeInfo => {
  switchTab(activeInfo.tabId);
});

// Track when URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    switchTab(tabId);
  }
});

// Fallback: update every 5 seconds (for sites like YouTube)
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
});

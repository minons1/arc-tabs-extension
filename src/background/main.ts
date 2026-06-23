import {
  TabRecord,
  DomainKeepList,
  ArcSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEY_TABS,
  STORAGE_KEY_KEEP,
  STORAGE_KEY_SETTINGS,
  ALARM_NAME,
  getDomain,
  isChromeUrl,
} from "../shared";

// ─── Storage helpers ─────────────────────────────────────────────────
async function getTabRecords(): Promise<Record<number, TabRecord>> {
  const result = await chrome.storage.local.get(STORAGE_KEY_TABS);
  return (result[STORAGE_KEY_TABS] as Record<number, TabRecord>) || {};
}

async function saveTabRecords(records: Record<number, TabRecord>): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_TABS]: records });
}

async function getKeepList(): Promise<DomainKeepList> {
  const result = await chrome.storage.local.get(STORAGE_KEY_KEEP);
  return (result[STORAGE_KEY_KEEP] as DomainKeepList) || {};
}

async function getSettings(): Promise<ArcSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  return (result[STORAGE_KEY_SETTINGS] as ArcSettings) || { ...DEFAULT_SETTINGS };
}

async function saveSettings(settings: ArcSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: settings });
}

// ─── Startup: cross-session inactivity tracking ───────────────────────
// When the browser restarts, tabs get new IDs but the same URLs.
// We build a URL→lastActive cache from old records so restored tabs
// inherit their real inactivity timestamp instead of appearing fresh.
let startupUrlCache: Record<string, number> | null = null;
let startupGracePeriod = false;

async function buildStartupUrlCache(): Promise<void> {
  const records = await getTabRecords();
  startupUrlCache = {};
  for (const record of Object.values(records)) {
    // Keep the most recent lastActive per URL (in case of duplicates)
    if (!startupUrlCache[record.url] || record.lastActive > startupUrlCache[record.url]) {
      startupUrlCache[record.url] = record.lastActive;
    }
  }
}

// ─── Track tab activity ──────────────────────────────────────────────
async function upsertTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id || !tab.url || isChromeUrl(tab.url) || tab.pinned) return;

  const records = await getTabRecords();
  const domain = getDomain(tab.url);

  if (records[tab.id]) {
    // Existing record — update metadata, but preserve lastActive during
    // startup grace period (browser restore events are not user activity)
    records[tab.id].url = tab.url;
    records[tab.id].domain = domain;
    records[tab.id].title = tab.title || domain;
    records[tab.id].favIconUrl = tab.favIconUrl;
    if (!startupGracePeriod) {
      records[tab.id].lastActive = Date.now();
    }
  } else {
    // New record — carry over lastActive from startup URL cache if available
    const previousActive = startupUrlCache?.[tab.url];
    records[tab.id] = {
      tabId: tab.id,
      url: tab.url,
      domain,
      title: tab.title || domain,
      lastActive: previousActive || Date.now(),
      favIconUrl: tab.favIconUrl,
    };
  }

  await saveTabRecords(records);
}

// When a tab is activated, update its lastActive
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await upsertTab(tab);
  } catch {
    // tab may have closed
  }
});

// When a tab updates (navigates), update its record
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    await upsertTab(tab);
  }
});

// When a tab is closed, remove its record
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const records = await getTabRecords();
  delete records[tabId];
  await saveTabRecords(records);
});

// ─── On install / startup: seed all existing tabs ────────────────────
async function seedExistingTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const records = await getTabRecords();
  const liveTabIds = new Set(tabs.filter((t) => t.id != null).map((t) => t.id!));

  for (const tab of tabs) {
    if (!tab.id || !tab.url || isChromeUrl(tab.url) || tab.pinned) continue;
    const domain = getDomain(tab.url);

    if (!records[tab.id]) {
      // Carry over lastActive from startup URL cache (cross-session matching)
      const previousActive = startupUrlCache?.[tab.url];
      records[tab.id] = {
        tabId: tab.id,
        url: tab.url,
        domain,
        title: tab.title || domain,
        lastActive: previousActive || Date.now(),
        favIconUrl: tab.favIconUrl,
      };
    }
  }

  // Clean up orphaned records from previous session (old tab IDs)
  for (const id of Object.keys(records)) {
    if (!liveTabIds.has(Number(id))) {
      delete records[Number(id)];
    }
  }

  await saveTabRecords(records);
}

// ─── Alarm: periodic check ───────────────────────────────────────────
async function setupAlarm(): Promise<void> {
  const settings = await getSettings();
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: settings.checkIntervalMinutes,
    periodInMinutes: settings.checkIntervalMinutes,
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await seedExistingTabs();
  await setupAlarm();
  // Run initial check so any already-stale tabs show up
  await checkInactiveTabs();
});

chrome.runtime.onStartup.addListener(async () => {
  // Build URL cache from previous session records BEFORE tabs restore events fire
  await buildStartupUrlCache();
  startupGracePeriod = true;
  await setupAlarm();

  // Wait for tabs to restore, then reconcile and check
  setTimeout(async () => {
    await seedExistingTabs();
    await checkInactiveTabs();
    // End grace period — from now on, tab activations are genuine user activity
    startupGracePeriod = false;
    startupUrlCache = null;
  }, 5000);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  await checkInactiveTabs();
});

// ─── Core logic: find & close inactive tabs ──────────────────────────
async function checkInactiveTabs(): Promise<void> {
  const settings = await getSettings();
  const inactivityMs = settings.inactivityMinutes * 60 * 1000;
  const now = Date.now();
  const records = await getTabRecords();
  const keepList = await getKeepList();

  // Get current live tabs
  const liveTabs = await chrome.tabs.query({});
  const liveTabIds = new Set(liveTabs.map((t) => t.id));
  const pinnedTabIds = new Set(liveTabs.filter((t) => t.pinned).map((t) => t.id));

  // Group inactive tabs by domain
  const inactiveByDomain: Record<string, TabRecord[]> = {};
  const toRemoveIds: number[] = [];

  for (const [id, record] of Object.entries(records)) {
    const tabId = Number(id);

    // Skip if tab no longer exists
    if (!liveTabIds.has(tabId)) {
      toRemoveIds.push(tabId);
      continue;
    }

    // Skip pinned tabs — they should never be auto-closed
    if (pinnedTabIds.has(tabId)) {
      record.lastActive = now;
      continue;
    }

    // Skip if domain is in keep list
    if (keepList[record.domain]) {
      // Update lastActive so it doesn't stay stale
      record.lastActive = now;
      continue;
    }

    // Check inactivity
    const inactiveFor = now - record.lastActive;
    if (inactiveFor >= inactivityMs) {
      if (!inactiveByDomain[record.domain]) {
        inactiveByDomain[record.domain] = [];
      }
      inactiveByDomain[record.domain].push(record);
    }
  }

  // Clean up stale records
  for (const id of toRemoveIds) {
    delete records[id];
  }
  await saveTabRecords(records);

  // If there are inactive tabs, store them for popup
  const totalInactive = Object.values(inactiveByDomain).flat().length;
  if (totalInactive > 0) {
    await chrome.storage.local.set({ arc_pending_closures: inactiveByDomain });
    chrome.action.setBadgeText({ text: String(totalInactive) });
    chrome.action.setBadgeBackgroundColor({ color: "#EF4444" });
  } else {
    chrome.action.setBadgeText({ text: "" });
    await chrome.storage.local.remove("arc_pending_closures");
  }
}

// ─── Update pending closures after removing some tabs ────────────────
async function removeTabsFromPending(tabIds: number[]): Promise<void> {
  const result = await chrome.storage.local.get("arc_pending_closures");
  const pending: Record<string, TabRecord[]> = result.arc_pending_closures || {};
  const tabIdSet = new Set(tabIds);

  for (const domain of Object.keys(pending)) {
    pending[domain] = pending[domain].filter((t) => !tabIdSet.has(t.tabId));
    if (pending[domain].length === 0) {
      delete pending[domain];
    }
  }

  const total = Object.values(pending).flat().length;
  if (total > 0) {
    await chrome.storage.local.set({ arc_pending_closures: pending });
    chrome.action.setBadgeText({ text: String(total) });
  } else {
    await chrome.storage.local.remove("arc_pending_closures");
    chrome.action.setBadgeText({ text: "" });
  }
}

// ─── Message handler (popup communication) ───────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "GET_PENDING_CLOSURES") {
      const result = await chrome.storage.local.get("arc_pending_closures");
      sendResponse({ data: result.arc_pending_closures || {} });
    } else if (message.type === "GET_SETTINGS") {
      const settings = await getSettings();
      sendResponse({ data: settings });
    } else if (message.type === "SAVE_SETTINGS") {
      const newSettings: ArcSettings = message.settings;
      await saveSettings(newSettings);
      // Recreate alarm with new interval
      await setupAlarm();
      // Re-check with new threshold
      await checkInactiveTabs();
      sendResponse({ ok: true });
    } else if (message.type === "KEEP_DOMAIN") {
      const keepList = await getKeepList();
      keepList[message.domain] = true;
      await chrome.storage.local.set({ [STORAGE_KEY_KEEP]: keepList });

      // Update lastActive for all tabs of this domain & remove from pending
      const records = await getTabRecords();
      const now = Date.now();
      const keptTabIds: number[] = [];
      for (const [id, record] of Object.entries(records)) {
        if (record.domain === message.domain) {
          record.lastActive = now;
          keptTabIds.push(Number(id));
        }
      }
      await saveTabRecords(records);
      await removeTabsFromPending(keptTabIds);
      sendResponse({ ok: true });
    } else if (message.type === "REMOVE_KEEP_DOMAIN") {
      const keepList = await getKeepList();
      delete keepList[message.domain];
      await chrome.storage.local.set({ [STORAGE_KEY_KEEP]: keepList });
      sendResponse({ ok: true });
    } else if (message.type === "CLOSE_TABS") {
      const tabIds: number[] = message.tabIds;
      for (const tabId of tabIds) {
        try {
          await chrome.tabs.remove(tabId);
        } catch {
          // already closed
        }
      }
      // Clean up records
      const records = await getTabRecords();
      for (const tabId of tabIds) {
        delete records[tabId];
      }
      await saveTabRecords(records);
      // Remove only these tabs from pending (keeps others)
      await removeTabsFromPending(tabIds);
      sendResponse({ ok: true });
    } else if (message.type === "SNOOZE_TABS") {
      // Reset lastActive for snoozed tabs
      const tabIds: number[] = message.tabIds;
      const records = await getTabRecords();
      const now = Date.now();
      for (const tabId of tabIds) {
        if (records[tabId]) {
          records[tabId].lastActive = now;
        }
      }
      await saveTabRecords(records);
      // Remove only these tabs from pending (keeps others)
      await removeTabsFromPending(tabIds);
      sendResponse({ ok: true });
    } else if (message.type === "GET_KEEP_LIST") {
      const keepList = await getKeepList();
      sendResponse({ data: keepList });
    } else if (message.type === "GET_ALL_TABS") {
      const records = await getTabRecords();
      sendResponse({ data: records });
    } else if (message.type === "TRIGGER_CHECK") {
      await checkInactiveTabs();
      sendResponse({ ok: true });
    }
  })();

  return true; // keep channel open for async
});

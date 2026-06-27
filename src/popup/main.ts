import {
  TabRecord,
  DomainKeepList,
  ArcSettings,
  DEFAULT_SETTINGS,
  ACCENT_COLORS,
  OperatingMode,
  getDomain,
  formatInactivityLabel,
} from "../shared";

// ─── SVG icons ───────────────────────────────────────────────────────
const ICONS = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  snooze: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M12 8v4l2 2"/></svg>`,
  globe: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
  remove: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  chevron: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
};

// ─── DOM refs ────────────────────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const sectionSettings = $<HTMLElement>("section-settings");
const sectionInactive = $<HTMLElement>("section-inactive");
const sectionEmpty = $<HTMLElement>("section-empty");
const inactiveList = $<HTMLElement>("inactive-list");
const inactiveCount = $<HTMLElement>("inactive-count");
const keepCount = $<HTMLElement>("keep-count");
const keeplist = $<HTMLElement>("keeplist");
const loading = $<HTMLElement>("loading");
const inputDomain = $<HTMLInputElement>("input-domain");
const selectInactivity = $<HTMLSelectElement>("select-inactivity");
const selectCheckInterval = $<HTMLSelectElement>("select-check-interval");
const accentPicker = $<HTMLElement>("accent-picker");
const emptyTitle = $<HTMLElement>("empty-title");
const emptySub = $<HTMLElement>("empty-sub");
const viewTabs = $<HTMLElement>("view-tabs");
const viewProtected = $<HTMLElement>("view-protected");

// Mode toggle (segmented control: off → manual → auto)
const modeToggle = $<HTMLElement>("mode-toggle");
const modeIndicator = $<HTMLElement>("mode-indicator");
const modeSegments = modeToggle.querySelectorAll<HTMLButtonElement>(".mode-segment");
const MODE_ORDER: OperatingMode[] = ["off", "manual", "auto"];

function renderModeToggle(mode: OperatingMode) {
  const pos = MODE_ORDER.indexOf(mode);
  modeIndicator.dataset.pos = String(pos);

  modeSegments.forEach((seg) => {
    const segMode = seg.dataset.mode as OperatingMode;
    seg.classList.remove("active-off", "active-manual", "active-auto");
    if (segMode === mode) {
      seg.classList.add(`active-${mode}`);
    }
  });
}

function triggerModeAnimation(mode: OperatingMode) {
  // Pulse + flash the indicator
  modeIndicator.classList.remove("pulse", "flash");
  // Force reflow to restart animation
  void modeIndicator.offsetWidth;
  modeIndicator.classList.add("pulse", "flash");
  modeIndicator.addEventListener("animationend", () => {
    modeIndicator.classList.remove("pulse", "flash");
  }, { once: true });
}

function spawnRipple(btn: HTMLButtonElement, e: MouseEvent) {
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  const rect = btn.getBoundingClientRect();
  ripple.style.left = `${e.clientX - rect.left - 15}px`;
  ripple.style.top = `${e.clientY - rect.top - 15}px`;
  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

modeSegments.forEach((seg) => {
  seg.addEventListener("click", async () => {
    const targetMode = seg.dataset.mode as OperatingMode;
    const currentMode = MODE_ORDER[Number(modeIndicator.dataset.pos)];
    if (targetMode === currentMode) return;

    currentSettings.mode = targetMode;
    renderModeToggle(targetMode);
    await sendMessage({ type: "SAVE_SETTINGS", settings: currentSettings });
    await refresh();
  });
});

// Nav tab buttons
const navButtons = document.querySelectorAll<HTMLButtonElement>(".nav-btn");

// ─── State ───────────────────────────────────────────────────────────
let currentSettings: ArcSettings = { ...DEFAULT_SETTINGS };
let currentView: "tabs" | "protected" = "tabs";

// ─── Helpers ─────────────────────────────────────────────────────────
function formatTimeAgo(timestamp: number): string {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

function sendMessage<T = any>(message: object): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

function showLoading(show: boolean) {
  loading.classList.toggle("hidden", !show);
}

// ─── View switching ──────────────────────────────────────────────────
function switchView(view: "tabs" | "protected") {
  currentView = view;
  viewTabs.classList.toggle("hidden", view !== "tabs");
  viewProtected.classList.toggle("hidden", view !== "protected");

  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchView(btn.dataset.view as "tabs" | "protected");
  });
});
type PendingClosures = Record<string, TabRecord[]>;

function renderInactiveTabs(data: PendingClosures) {
  const domains = Object.keys(data);
  const totalTabs = domains.reduce((sum, d) => sum + data[d].length, 0);

  if (totalTabs === 0) return;

  sectionInactive.classList.remove("hidden");
  inactiveCount.textContent = String(totalTabs);
  inactiveList.innerHTML = "";

  const sorted = domains.sort((a, b) => data[b].length - data[a].length);

  for (const domain of sorted) {
    const tabs = data[domain];
    const card = document.createElement("div");
    card.className = "domain-card";

    const row = document.createElement("div");
    row.className = "domain-row";

    const left = document.createElement("div");
    left.className = "domain-row-left";

    let favicon: string;
    if (tabs[0].favIconUrl) {
      favicon = `<img class="favicon" src="${tabs[0].favIconUrl}" data-fallback="globe" />`;
    } else {
      favicon = `<span class="favicon-placeholder">${ICONS.globe}</span>`;
    }

    left.innerHTML = `
      ${favicon}
      <div class="domain-info">
        <span class="domain-name">${domain}</span>
        <span class="domain-meta">${tabs.length} tab${tabs.length > 1 ? "s" : ""} · ${formatTimeAgo(tabs[0].lastActive)}</span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "domain-row-actions";

    const btnKeep = document.createElement("button");
    btnKeep.className = "action-btn action-keep";
    btnKeep.innerHTML = ICONS.shield;
    btnKeep.title = `Keep ${domain} (never auto-close)`;
    btnKeep.addEventListener("click", async (e) => {
      e.stopPropagation();
      await sendMessage({ type: "KEEP_DOMAIN", domain });
      await refresh();
    });

    const btnSnooze = document.createElement("button");
    btnSnooze.className = "action-btn action-snooze";
    btnSnooze.innerHTML = ICONS.snooze;
    btnSnooze.title = `Snooze ${domain} (reset timer)`;
    btnSnooze.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tabIds = tabs.map((t) => t.tabId);
      await sendMessage({ type: "SNOOZE_TABS", tabIds });
      await refresh();
    });

    const btnClose = document.createElement("button");
    btnClose.className = "action-btn action-close";
    btnClose.innerHTML = ICONS.close;
    btnClose.title = `Close all ${domain} tabs`;
    btnClose.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tabIds = tabs.map((t) => t.tabId);
      await sendMessage({ type: "CLOSE_TABS", tabIds });
      await refresh();
    });

    actions.append(btnKeep, btnSnooze, btnClose);

    const btnExpand = document.createElement("button");
    btnExpand.className = "action-btn action-expand";
    btnExpand.innerHTML = ICONS.chevron;
    btnExpand.title = "Show tabs";

    row.append(left, actions, btnExpand);
    card.appendChild(row);

    const tabList = document.createElement("div");
    tabList.className = "tab-list collapsed";

    for (const tab of tabs) {
      const tabItem = document.createElement("div");
      tabItem.className = "tab-item";
      tabItem.innerHTML = `
        <span class="tab-title" title="${tab.title}">${tab.title}</span>
        <span class="tab-time">${formatTimeAgo(tab.lastActive)}</span>
      `;
      tabList.appendChild(tabItem);
    }

    card.appendChild(tabList);

    const toggleExpand = (e: Event) => {
      if ((e.target as HTMLElement).closest("button")) return;
      tabList.classList.toggle("collapsed");
      btnExpand.classList.toggle("expanded");
    };
    row.addEventListener("click", toggleExpand);
    btnExpand.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleExpand(e);
    });

    inactiveList.appendChild(card);
  }

  inactiveList.querySelectorAll<HTMLImageElement>('img.favicon').forEach((img) => {
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = 'favicon-placeholder';
      span.innerHTML = ICONS.globe;
      img.replaceWith(span);
    });
  });
}

// ─── Render keep list ────────────────────────────────────────────────
function renderKeepList(data: DomainKeepList) {
  const domains = Object.keys(data);
  keepCount.textContent = String(domains.length);

  if (domains.length === 0) {
    keeplist.innerHTML = `<div class="empty-keep">No protected domains yet</div>`;
    return;
  }

  keeplist.innerHTML = "";
  for (const domain of domains.sort()) {
    const item = document.createElement("div");
    item.className = "keep-item";
    item.innerHTML = `
      <span class="keep-domain">${ICONS.shield} ${domain}</span>
      <button class="btn btn-sm btn-remove" data-domain="${domain}" title="Remove protection">${ICONS.remove}</button>
    `;
    keeplist.appendChild(item);
  }

  keeplist.querySelectorAll<HTMLButtonElement>(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const domain = btn.dataset.domain!;
      await sendMessage({ type: "REMOVE_KEEP_DOMAIN", domain });
      await refresh();
    });
  });
}

// ─── Render settings ─────────────────────────────────────────────────
function renderSettings(settings: ArcSettings) {
  currentSettings = settings;
  selectInactivity.value = String(settings.inactivityMinutes);
  selectCheckInterval.value = String(settings.checkIntervalMinutes);
  renderModeToggle(settings.mode);

  // Render accent color picker
  accentPicker.innerHTML = "";
  for (const color of ACCENT_COLORS) {
    const btn = document.createElement("button");
    btn.className = "accent-swatch";
    btn.style.background = color.value;
    btn.title = color.name;
    if (settings.accentColor === color.value) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", async () => {
      currentSettings.accentColor = color.value;
      applyAccentColor(color.value, color.hover);
      await sendMessage({ type: "SAVE_SETTINGS", settings: currentSettings });
      renderSettings(currentSettings);
    });
    accentPicker.appendChild(btn);
  }
}

// ─── Apply accent color to CSS variables ──────────────────────────────
function applyAccentColor(value: string, hover: string) {
  document.documentElement.style.setProperty("--accent", value);
  document.documentElement.style.setProperty("--accent-hover", hover);
}

// ─── Refresh data ────────────────────────────────────────────────────
async function refresh() {
  showLoading(true);

  try {
    const [pendingResult, keepResult, settingsResult] = await Promise.all([
      sendMessage<{ data: PendingClosures }>({ type: "GET_PENDING_CLOSURES" }),
      sendMessage<{ data: DomainKeepList }>({ type: "GET_KEEP_LIST" }),
      sendMessage<{ data: ArcSettings }>({ type: "GET_SETTINGS" }),
    ]);

    const settings = settingsResult.data || { ...DEFAULT_SETTINGS };
    renderSettings(settings);

    const accentColor = ACCENT_COLORS.find((c) => c.value === settings.accentColor);
    if (accentColor) {
      applyAccentColor(accentColor.value, accentColor.hover);
    }

    renderKeepList(keepResult.data || {});

    // ── Tabs view logic ─────────────────────────────────────────────
    sectionInactive.classList.add("hidden");
    sectionEmpty.classList.add("hidden");

    if (settings.mode === "off") {
      emptyTitle.textContent = "Extension is off";
      emptySub.textContent = "Enable Manual or Auto mode to start tracking tabs";
      sectionEmpty.classList.remove("hidden");
    } else {
      const pendingData = pendingResult.data || {};
      const totalInactive = Object.values(pendingData).flat().length;

      if (totalInactive > 0) {
        renderInactiveTabs(pendingData);
      } else {
        emptyTitle.textContent = "All tabs are active!";
        emptySub.textContent = `No tabs have been inactive for ${formatInactivityLabel(currentSettings.inactivityMinutes)}`;
        sectionEmpty.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Failed to load data:", err);
  } finally {
    showLoading(false);
  }
}

// ─── Event listeners ─────────────────────────────────────────────────

// Toggle settings
$("btn-toggle-settings").addEventListener("click", () => {
  sectionSettings.classList.toggle("hidden");
});

// Settings: auto-save on change
selectInactivity.addEventListener("change", async () => {
  currentSettings.inactivityMinutes = Number(selectInactivity.value);
  await sendMessage({ type: "SAVE_SETTINGS", settings: currentSettings });
  await refresh();
});

selectCheckInterval.addEventListener("change", async () => {
  currentSettings.checkIntervalMinutes = Number(selectCheckInterval.value);
  await sendMessage({ type: "SAVE_SETTINGS", settings: currentSettings });
  await refresh();
});

// Check now
$("btn-check").addEventListener("click", async () => {
  showLoading(true);
  await sendMessage({ type: "TRIGGER_CHECK" });
  setTimeout(() => refresh(), 500);
});

// Close all
$("btn-close-all").addEventListener("click", async () => {
  const result = await sendMessage<{ data: PendingClosures }>({
    type: "GET_PENDING_CLOSURES",
  });
  const data = result.data || {};
  const tabIds = Object.values(data).flat().map((t) => t.tabId);
  if (tabIds.length === 0) return;
  if (confirm(`Close ${tabIds.length} inactive tabs?`)) {
    await sendMessage({ type: "CLOSE_TABS", tabIds });
    await refresh();
  }
});

// Snooze all
$("btn-snooze-all").addEventListener("click", async () => {
  const result = await sendMessage<{ data: PendingClosures }>({
    type: "GET_PENDING_CLOSURES",
  });
  const data = result.data || {};
  const tabIds = Object.values(data).flat().map((t) => t.tabId);
  if (tabIds.length === 0) return;
  await sendMessage({ type: "SNOOZE_TABS", tabIds });
  await refresh();
});

// Add domain
$("btn-add-domain").addEventListener("click", async () => {
  let domain = inputDomain.value.trim();
  if (!domain) return;
  domain = getDomain("https://" + domain.replace(/^https?:\/\//, ""));
  if (domain) {
    await sendMessage({ type: "KEEP_DOMAIN", domain });
    inputDomain.value = "";
    await refresh();
  }
});

inputDomain.addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-add-domain").click();
});

// ─── Init ────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", refresh);
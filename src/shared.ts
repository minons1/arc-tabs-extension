// ─── Types ───────────────────────────────────────────────────────────
export interface TabRecord {
  tabId: number;
  url: string;
  domain: string;
  title: string;
  lastActive: number; // timestamp ms
  favIconUrl?: string;
}

export interface DomainKeepList {
  [domain: string]: boolean;
}

export interface ArcSettings {
  inactivityMinutes: number;
  checkIntervalMinutes: number;
}

export const DEFAULT_SETTINGS: ArcSettings = {
  inactivityMinutes: 12 * 60, // 12 hours
  checkIntervalMinutes: 5,    // 5 minutes
};

export const STORAGE_KEY_TABS = "arc_tabs";
export const STORAGE_KEY_KEEP = "arc_keep_list";
export const STORAGE_KEY_SETTINGS = "arc_settings";
export const ALARM_NAME = "arc-tab-check";

// ─── Inactivity presets ──────────────────────────────────────────────
export const INACTIVITY_PRESETS = [
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "6 hours", value: 360 },
  { label: "12 hours", value: 720 },
  { label: "24 hours", value: 1440 },
  { label: "48 hours", value: 2880 },
];

// ─── Helpers ─────────────────────────────────────────────────────────
export function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isChromeUrl(url: string): boolean {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("brave://") ||
    url.startsWith("about:")
  );
}

export function formatInactivityLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""}`;
  const days = hours / 24;
  return `${days} day${days > 1 ? "s" : ""}`;
}

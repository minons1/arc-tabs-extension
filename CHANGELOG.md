# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-06-27

### Added

- **Operating mode toggle** (Off / Manual / Auto) in the toolbar
  - **Off** — extension is fully disabled, no tracking, no alarms, no badge
  - **Manual** — watches tabs and shows inactive list for user review; respects protected domains and pinned tabs
  - **Auto** — same as Manual, but automatically closes inactive tabs on every check (alarm + startup); respects protected domains and pinned tabs
- **Nav tabs** (Tabs / Protected) in the toolbar — Protected Domains moved to its own view
- **Active Tabs view** — when no inactive tabs exist, the main view shows all tracked active tabs grouped by domain (read-only overview)
- **Off mode empty state** — clear messaging when extension is disabled

### Changed

- Protected Domains section moved from the main view to its own "Protected" nav tab
- Main popup view is now the tabs list (inactive if any, active as fallback)
- Mode toggle colors: Manual = accent, Auto = red, Off = gray

## [0.1.2] - 2026-06-23

### Changed

- **Cross-session inactivity tracking** — on browser restart, restored tabs now inherit their real `lastActive` timestamp from the previous session (matched by URL), so tabs that were idle before closing are still flagged as inactive
- **Immediate check on startup** — the extension runs an inactivity check right after browser launch (5s grace for tabs to restore), instead of waiting for the first alarm cycle
- **Startup grace period** — tab restore events during browser startup no longer reset the inactivity timer (only genuine user activity resets it after the grace period ends)
- **Orphan cleanup** — old tab records from previous sessions (stale tab IDs) are cleaned up on startup

## [0.1.1] - 2026-06-23

### Added

- **Accent color picker** in Settings — choose from 6 pastel colors (Violet, Rose, Sky, Mint, Peach, Coral) that theme the entire popup UI

### Changed

- **Pinned tabs are now fully protected** — pinned tabs are never tracked, never scanned for inactivity, and will never be auto-closed
- Removed the "How to Use" help panel and its header button — the UI is self-explanatory enough without it

## [0.1.0] - 2026-06-22

### Added

- Auto-close inactive tabs after a configurable inactivity period (default: 12 hours)
- Periodic check via Chrome alarms (default: every 5 minutes)
- Domain protection (keep list) — protect specific domains from ever being auto-closed
- Popup UI with inactive tabs grouped by domain
- Per-domain actions: Keep (protect), Snooze (reset timer), Close
- Bulk actions: Close All, Snooze All
- Red badge indicator showing count of pending closures
- Collapsible domain rows to see individual tab titles
- Add/remove protected domains via input field
- Configurable inactivity threshold and check interval in Settings
- Brave compatible — works with "Continue where you left off"
- Dark theme UI with Solar-style icons

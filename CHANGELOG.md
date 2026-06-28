# Changelog

All notable changes to this project will be documented in this file.

## [0.2.2] - 2026-06-28
### Added

- **Docs** — Added `README.md` and `AGENTS.md` for developer reference, including installation instructions, architecture overview, and message protocol details

## [0.2.1] - 2026-06-28

### Fixed

- **Mode indicator centering** — the sliding indicator in the mode toggle now positions itself based on actual segment dimensions instead of assuming equal thirds, fixing the "Manual" text appearing off-center within the indicator

## [0.2.0] - 2026-06-27

### Added

- **Auto mode only closes tabs on browser startup** — during a session, auto mode behaves like manual (flags inactive tabs for review); tabs are only auto-closed when the browser starts up and stale tabs are detected
- **Nav tabs** (Tabs / Protected) in the toolbar — Protected Domains moved to its own view
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

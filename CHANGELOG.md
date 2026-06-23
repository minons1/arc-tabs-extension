# Changelog

All notable changes to this project will be documented in this file.

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

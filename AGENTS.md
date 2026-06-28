# AGENTS.md

Guide for AI agents contributing to Arc Tabs.

## Project overview

Arc Tabs is a Chromium extension (Manifest V3) that manages inactive browser tabs. It tracks tab activity, flags tabs idle beyond a configurable threshold, and lets users review/close them manually or auto-close them on startup.

**Target browsers:** Chrome, Brave, Edge, Vivaldi — any Chromium-based browser.

## Tech stack

- **Language:** TypeScript (strict mode)
- **Build:** Vite 6 — builds popup (HTML entry) and background service worker
- **Package manager:** pnpm
- **Runtime:** Chrome Extension APIs (no Node APIs in extension code)
- **No test framework** currently installed

## Commands

```bash
pnpm install       # install deps
pnpm dev           # watch mode — rebuild on file changes
pnpm build         # production build → dist/
pnpm clean         # rm -rf dist
pnpm bump p        # patch bump (0.2.1 → 0.2.2)
pnpm bump mi       # minor bump (0.2.1 → 0.3.0)
pnpm bump ma       # major bump (0.2.1 → 1.0.0)
```

## Architecture

```
src/
├── shared.ts              # Types, constants, helpers — imported by both popup and background
├── background/main.ts     # Service worker: tab tracking, alarms, message handling, storage
└── popup/
    ├── index.html         # Popup UI (single-page, two views: Tabs / Protected)
    ├── main.ts            # Popup logic: rendering, event handlers, messaging
    └── style.css          # Dark theme styles (CSS custom properties for theming)

public/
├── manifest.json          # Manifest V3 — version is synced from package.json by bump script
└── icons/                 # 16/48/128px PNG icons

dist/                      # Build output — load this folder as unpacked extension
```

### Data flow

1. **Background service worker** (`background/main.ts`) monitors `chrome.tabs` events (onActivated, onUpdated, onRemoved) and persists `TabRecord` objects to `chrome.storage.local`
2. A **chrome.alarms** periodic check finds tabs inactive beyond the threshold, stores them as "pending closures", and sets a badge count
3. **Popup** (`popup/main.ts`) sends messages to the background via `chrome.runtime.sendMessage` to fetch data and trigger actions
4. Settings, tab records, and keep list are all stored in `chrome.storage.local`

### Key types (shared.ts)

- `OperatingMode`: `"off" | "manual" | "auto"` — controls extension behavior
- `ArcSettings`: inactivity threshold, check interval, accent color, mode
- `TabRecord`: per-tab tracking data (tabId, url, domain, title, lastActive, favIconUrl)
- `DomainKeepList`: `Record<string, boolean>` — protected domains

### Message protocol (popup ↔ background)

All messages go through `chrome.runtime.sendMessage`. The background handler returns `true` to indicate async response.

| Message type | Payload | Response |
|---|---|---|
| `GET_PENDING_CLOSURES` | — | `{ data: Record<string, TabRecord[]> }` |
| `GET_SETTINGS` | — | `{ data: ArcSettings }` |
| `SAVE_SETTINGS` | `{ settings: ArcSettings }` | `{ ok: true }` |
| `KEEP_DOMAIN` | `{ domain: string }` | `{ ok: true }` |
| `REMOVE_KEEP_DOMAIN` | `{ domain: string }` | `{ ok: true }` |
| `CLOSE_TABS` | `{ tabIds: number[] }` | `{ ok: true }` |
| `SNOOZE_TABS` | `{ tabIds: number[] }` | `{ ok: true }` |
| `GET_KEEP_LIST` | — | `{ data: DomainKeepList }` |
| `GET_ALL_TABS` | — | `{ data: Record<number, TabRecord> }` |
| `TRIGGER_CHECK` | — | `{ ok: true }` |

## Coding conventions

- **No semicolons** in TypeScript source files
- **2-space indentation**
- **Single quotes** for strings
- **Arrow functions** for callbacks and handlers
- **CSS custom properties** (`--var-name`) for theming — accent color is swapped at runtime via `document.documentElement.style.setProperty`
- **No external UI libraries** — all HTML/CSS is hand-written
- **SVG icons** are inlined as string constants in `main.ts` (ICONS object) or directly in HTML
- **DOM queries** use a typed `$<T>(id)` helper — prefer `document.getElementById` over querySelector for element IDs

## Styling notes

- Dark theme with CSS variables defined in `:root`
- The `.mode-toggle` indicator is positioned dynamically via JS (`getBoundingClientRect`) — do not use CSS `calc()` for indicator positioning as segment widths are not equal
- Sections use `.hidden` class (display: none !important) for visibility toggling
- Collapsible sections use max-height transitions

## When making changes

### Adding a new setting
1. Add the field to `ArcSettings` interface and `DEFAULT_SETTINGS` in `shared.ts`
2. Add UI controls in `popup/index.html`
3. Wire up the control in `popup/main.ts` (render + change handler + `SAVE_SETTINGS` message)
4. Handle the new setting in `background/main.ts` if it affects background behavior
5. Update `CHANGELOG.md`

### Adding a new message type
1. Add the handler in `background/main.ts` inside the `onMessage` listener
2. Add the sender in `popup/main.ts`
3. Document it in the message protocol table above

### Version bumps
- Run `pnpm bump p|mi|ma` — this updates both `package.json` and `public/manifest.json`
- Always add a `CHANGELOG.md` entry with the new version before or after bumping

### Before submitting
- Run `pnpm build` and verify no errors
- Load the extension in a Chromium browser and test the affected feature
- Check that the mode toggle indicator aligns correctly with each segment
- Verify popup opens, settings save, and badge updates after tab actions

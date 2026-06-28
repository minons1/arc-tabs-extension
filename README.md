# Arc Tabs 🌀

A Chromium extension that automatically manages inactive tabs — inspired by Arc browser's tab auto-archiving.

Works with Chrome, Brave, Edge, Vivaldi, and any Chromium-based browser.

## Features

- **Three operating modes** — Off (disabled), Manual (review & close yourself), Auto (closes stale tabs on browser startup)
- **Smart inactivity tracking** — Monitors tab focus and navigation; survives browser restarts with cross-session timestamp inheritance
- **Domain protection** — Keep specific domains open forever (e.g. `github.com`, `gmail.com`)
- **Per-domain actions** — 🛡️ Keep (protect domain), ⏸ Snooze (reset timer), ✕ Close
- **Bulk actions** — Close All / Snooze All inactive tabs at once
- **Configurable thresholds** — Inactivity period (30 min – 48 hours) and check interval (1 – 60 min)
- **Accent color picker** — 6 pastel themes (Violet, Rose, Sky, Mint, Peach, Coral)
- **Pinned tab safety** — Pinned tabs are never tracked or closed
- **Badge indicator** — Extension icon shows count of pending closures
- **"Continue where you left off"** compatible — Works seamlessly with session restore

## Install

1. Run `pnpm build`
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`, etc.)
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder

## Dev

```bash
pnpm install
pnpm dev    # watch mode — rebuild on changes
pnpm build  # production build
```

## How it works

### Tab tracking

The background service worker monitors tab activity (focus, navigation) and records timestamps. Every **5 minutes** (configurable), an alarm checks for tabs inactive beyond the threshold (default: 12 hours). Inactive tabs are grouped by domain and stored as "pending closures", and a red badge appears on the extension icon.

### Operating modes

| Mode | Behavior |
|------|----------|
| **Off** | Extension is disabled — no tracking, no badge |
| **Manual** | Inactive tabs are flagged and shown in the popup for you to review and close |
| **Auto** | Same as Manual during a session, but stale tabs are **auto-closed on browser startup** |

### Popup UI

Click the extension icon to open the popup:

- **Tabs view** — See all inactive tabs grouped by domain with expand/collapse for individual tab titles
- **Protected view** — Manage your protected domains (never auto-closed)
- **Settings** — Inactivity threshold, check interval, accent color

### Session persistence

On browser restart, restored tabs inherit their real `lastActive` timestamp from the previous session (matched by URL), so tabs that were idle before closing are still flagged as inactive. An immediate check runs 5 seconds after startup to catch stale tabs right away.

## Project structure

```
src/
├── shared.ts          # Types, constants, helpers
├── background/
│   └── main.ts        # Service worker: tab tracking, alarms, message handling
└── popup/
    ├── index.html     # Popup UI
    ├── main.ts        # Popup logic
    └── style.css      # Dark theme styles
public/
├── manifest.json      # Chromium extension manifest v3
└── icons/             # Extension icons
```

## License

MIT

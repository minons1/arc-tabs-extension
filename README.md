# Arc Tabs 🌀

A Chrome/Brave extension that automatically closes tabs after 12 hours of inactivity — inspired by Arc browser's tab auto-archiving.

## Features

- **Auto-close inactive tabs** — Tabs inactive for 12+ hours are flagged for closure
- **Domain protection** — Keep specific domains open forever (e.g. `github.com`, `gmail.com`)
- **Confirmation popup** — See all inactive tabs grouped by domain, choose what to keep or close
- **Snooze** — Reset the inactivity timer for tabs you're not ready to close
- **Badge indicator** — Red badge shows count of pending closures
- **Brave compatible** — Works with "Continue where you left off" setting

## Install

1. Run `npm run build`
2. Open `brave://extensions` (or `chrome://extensions`)
3. Enable **Developer mode**
4. Click **Load unpacked** → select the `dist/` folder

## Dev

```bash
npm install
npm run dev    # watch mode — rebuild on changes
npm run build  # production build
```

## How it works

1. **Background service worker** tracks tab activity (focus, navigation) with timestamps
2. Every **5 minutes**, an alarm checks for tabs inactive 12+ hours
3. Inactive tabs are grouped by domain and stored as "pending closures"
4. A **red badge** appears on the extension icon with the count
5. Click the icon to open the popup:
   - See all inactive tabs grouped by domain
   - **🛡️ Keep** — Protect a domain from ever being auto-closed
   - **⏸ Snooze** — Reset the timer for that domain's tabs
   - **✕ Close** — Close all tabs for that domain
   - **Close All / Snooze All** — Bulk actions
6. Protected domains are managed in the **Protected Domains** section

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
├── manifest.json      # Chrome extension manifest v3
└── icons/             # Extension icons
```

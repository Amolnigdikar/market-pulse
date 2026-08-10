# Market Pulse — PWA

A vanilla HTML/CSS/JS build of the dashboard — no React, no bundler, no
build step. Same tabs and features as the design we finalized: FII/DII
flows (overview, by stock, by sector), stock watchlist with fundamentals +
compare, mutual fund list with fundamentals + compare.

## Files
```
index.html        entry point
styles.css         all styling
app.js             all app logic + sample data
manifest.json       makes it installable
service-worker.js    caches the app shell for offline use
icons/               app icons (192px, 512px)
```

## Run it locally
PWAs need to be served over HTTP(S) — opening `index.html` directly with
`file://` won't register the service worker. Easiest option:

```
cd market-pulse-pwa
python3 -m http.server 8000
```
Then visit `http://localhost:8000` from your phone (same Wi-Fi) or the
Chrome DevTools device emulator.

## Installing on Android
1. Host these files somewhere reachable over HTTPS — GitHub Pages, Netlify,
   Vercel, or any static host all work free and need zero backend.
2. Open the URL in Chrome on your Android phone.
3. Tap the ⋮ menu → **"Add to Home screen"** (or Chrome may prompt you
   automatically). That installs it as a standalone app icon — opens
   without browser chrome, works offline (cached shell), shows up in the
   app switcher like a native app.

HTTPS is required for install prompts and service workers to work — plain
HTTP hosting won't offer the install option.

## Real data — already wired in
`app.js` now fetches `./data.json` on load. If it's missing or malformed,
it falls back to the sample data silently, so the app never breaks — you
just see a "Sample data" note in the header instead of a real "Data as of"
date.

### Refreshing data.json
`build-data.js` calls the NSE and AMFI fetchers from before and writes
their output into `data.json`:

```
node build-data.js
```

Run this once a day after market close (both sources only publish daily
anyway) — e.g. a cron job or a scheduled GitHub Action that commits the
updated `data.json` back to your repo/host.

**What's live vs. still sample**, honestly:
- ✅ FII/DII net flow totals (`flowData`) — from NSE
- ✅ Mutual fund NAVs (`funds[].nav`) — from AMFI
- ⚠️ Stock watchlist (prices, P/E, ROE, etc.) — still sample. This needs a
  paid market-data API, which we deferred earlier.
- ⚠️ "By stock" / "by sector" FII-DII breakdown — still sample. NSE's
  public cash-market file only gives FII vs DII totals, not which stocks
  or sectors they traded — real attribution needs NSE's bulk/block deal
  reports, a heavier parsing job not built yet.

`data.sample.json` is the fallback baseline `build-data.js` merges new
numbers onto, so a single failed fetch (NSE rate-limits, AMFI down) never
wipes out the file — it just keeps yesterday's numbers for that piece.

/**
 * Builds data.json for the app from live sources:
 *  - NSE FII/DII cash-market activity
 *  - AMFI mutual fund NAVs
 *
 * Run this on a schedule (cron / GitHub Action) after each trading day
 * closes — both sources only publish once daily anyway.
 *
 *   node build-data.js
 *
 * Notes:
 *  - Stock watchlist (prices, P/E, ROE, etc.) is intentionally left as
 *    sample data — that needs a paid market-data API (Kite Connect,
 *    Finnhub, etc.), which we deferred per your call to skip stock data.
 *  - "By stock" / "by sector" FII-DII breakdowns aren't in NSE's public
 *    cash-market CSV (that file only has FII vs DII totals, not which
 *    stocks/sectors). Getting real per-stock attribution needs NSE's
 *    bulk/block deal reports, which is a heavier parse — left as sample
 *    for now, flagged clearly in the output.
 *
 * FIXES in this version:
 *  1. Cookie parsing now uses res.headers.getSetCookie() instead of
 *     naively splitting the merged Set-Cookie string on ",". The naive
 *     split corrupted cookies because Set-Cookie's Expires attribute
 *     itself contains a comma ("Expires=Wed, 07-Aug-2026..."), which was
 *     silently breaking the session cookie sent to NSE's API.
 *  2. Added a request timeout (AbortController) so a hung NSE request
 *     doesn't just make the whole Action time out with no useful error.
 *  3. Added one retry with backoff for the NSE session+API calls, since
 *     NSE's WAF/bot-protection intermittently rejects the first request.
 *  4. The script now exits with a non-zero code if BOTH sources fail to
 *     fetch AND there's no existing data.json to fall back on — before,
 *     it always exited 0, so the Action showed green even when nothing
 *     was actually updated. This alone was likely masking the real
 *     failure from you.
 *  5. Logs the raw HTTP status + a snippet of the response body on
 *     failure, since NSE returning a 403 or an HTML "access denied" page
 *     instead of JSON is the single most common cause of this script
 *     silently doing nothing when run from a cloud/CI IP (GitHub-hosted
 *     runners are datacenter IPs, which NSE's bot protection frequently
 *     blocks even when headers/cookies are otherwise correct — if you
 *     see 403s below, that's almost certainly it, and you'd need to route
 *     this through a residential/rotating proxy or a self-hosted runner).
 */

const fs = require("fs");
const path = require("path");

const BASE = "https://www.nseindia.com";
const FII_DII_API = `${BASE}/api/fiidiiTradeReact`;
const NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: `${BASE}/report-detail/fii_dii_trading_activity`,
};

const REQUEST_TIMEOUT_MS = 15000;

function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(fn, { attempts = 2, delayMs = 2000, label = "request" } = {}) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(`${label} attempt ${i}/${attempts} failed: ${err.message}`);
      if (i < attempts) await sleep(delayMs * i);
    }
  }
  throw lastErr;
}

async function getSessionCookies() {
  const res = await fetchWithTimeout(BASE, { headers: BROWSER_HEADERS });

  // Node 18.14.1+ exposes getSetCookie(), which returns each Set-Cookie
  // header as a separate array entry. This is the fix: the old code did
  // res.headers.get("set-cookie") + .split(",") which breaks because
  // individual cookies contain commas in their Expires attribute.
  let cookiesArray = [];
  if (typeof res.headers.getSetCookie === "function") {
    cookiesArray = res.headers.getSetCookie();
  } else {
    // Fallback for older Node: best-effort split on ", " followed by a
    // cookie-name pattern, which handles the common case reasonably well.
    const raw = res.headers.get("set-cookie");
    if (raw) cookiesArray = raw.split(/,(?=\s*[A-Za-z0-9_]+=)/);
  }

  if (!cookiesArray.length) {
    const bodySnippet = (await res.text()).slice(0, 300);
    throw new Error(
      `No cookies returned from NSE homepage (status ${res.status}). Body snippet: ${bodySnippet}`
    );
  }

  return cookiesArray.map((c) => c.split(";")[0]).join("; ");
}

async function fetchFiiDii() {
  return withRetry(
    async () => {
      const cookie = await getSessionCookies();
      const res = await fetchWithTimeout(FII_DII_API, {
        headers: { ...BROWSER_HEADERS, Cookie: cookie },
      });

      if (!res.ok) {
        const bodySnippet = (await res.text()).slice(0, 300);
        throw new Error(`NSE API responded ${res.status}. Body snippet: ${bodySnippet}`);
      }

      let rows;
      try {
        rows = await res.json();
      } catch (e) {
        throw new Error(`NSE API did not return valid JSON (likely blocked/challenge page): ${e.message}`);
      }

      const fiiRow = rows.find((r) => /FII|FPI/i.test(r.category));
      const diiRow = rows.find((r) => /DII/i.test(r.category));
      return {
        date: fiiRow?.date || diiRow?.date || null,
        fiiNet: fiiRow ? Math.round(parseFloat(fiiRow.netValue)) : null,
        diiNet: diiRow ? Math.round(parseFloat(diiRow.netValue)) : null,
      };
    },
    { attempts: 3, delayMs: 3000, label: "NSE FII/DII fetch" }
  );
}

async function fetchNavFile(names) {
  return withRetry(
    async () => {
      const res = await fetchWithTimeout(NAV_URL, {
        headers: { "User-Agent": BROWSER_HEADERS["User-Agent"], Accept: "text/plain,*/*" },
      });
      if (!res.ok) {
        const bodySnippet = (await res.text()).slice(0, 300);
        throw new Error(`AMFI responded ${res.status}. Body snippet: ${bodySnippet}`);
      }
      const text = await res.text();
      const schemes = [];
      for (const line of text.split("\n")) {
        const parts = line.split(";");
        if (parts.length !== 6) continue;
        const [code, , , name, nav, date] = parts;
        if (!code.trim() || code.trim() === "Scheme Code") continue;
        schemes.push({ name: name.trim(), nav: nav.trim(), date: date.trim() });
      }
      if (!names || !names.length) return schemes.slice(0, 10);
      return names
        .map((n) => schemes.find((s) => s.name.toLowerCase().includes(n.toLowerCase())))
        .filter(Boolean);
    },
    { attempts: 2, delayMs: 2000, label: "AMFI NAV fetch" }
  );
}

async function main() {
  const outPath = path.join(__dirname, "data.json");
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : null;

  let fiiDiiToday = null;
  let fiiDiiError = null;
  try {
    fiiDiiToday = await fetchFiiDii();
    console.log("Fetched FII/DII:", fiiDiiToday);
  } catch (err) {
    fiiDiiError = err;
    console.error("FII/DII fetch failed, keeping previous data:", err.message);
  }

  let navMatches = [];
  let navError = null;
  const fundNamesToTrack = ["Parag Parikh Flexi Cap", "Quant Small Cap", "ICICI Pru Balanced Adv"];
  try {
    navMatches = await fetchNavFile(fundNamesToTrack);
    console.log("Fetched NAVs:", navMatches.map((s) => `${s.name}: ₹${s.nav}`));
  } catch (err) {
    navError = err;
    console.error("NAV fetch failed, keeping previous data:", err.message);
  }

  // Merge onto whatever was there before (or the fallback shape), so a
  // partial failure doesn't wipe out data we already had.
  const base = existing || require("./data.sample.json");

  const merged = JSON.parse(JSON.stringify(base));
  let wroteFiiDii = false;
  let wroteNav = false;

  if (fiiDiiToday && fiiDiiToday.fiiNet !== null && fiiDiiToday.diiNet !== null) {
    const day = fiiDiiToday.date || new Date().toISOString().slice(0, 10);
    merged.flowData = [...merged.flowData.slice(-8), { day, fii: fiiDiiToday.fiiNet, dii: fiiDiiToday.diiNet }];
    merged.meta.asOf = day;
    wroteFiiDii = true;
  }

  if (navMatches.length) {
    merged.funds = merged.funds.map((f) => {
      const match = navMatches.find((m) => m.name.toLowerCase().includes(f.name.toLowerCase().split(" ")[0]));
      return match ? { ...f, nav: `₹${match.nav}` } : f;
    });
    wroteNav = true;
  }

  merged.meta.source = "NSE (FII/DII) + AMFI (fund NAVs); stock watchlist & sector/stock-wise breakdown still sample";
  merged.meta.lastRunAt = new Date().toISOString();
  merged.meta.lastRunStatus = {
    fiiDiiUpdated: wroteFiiDii,
    navUpdated: wroteNav,
    fiiDiiError: fiiDiiError ? fiiDiiError.message : null,
    navError: navError ? navError.message : null,
  };

  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${outPath} (fiiDiiUpdated=${wroteFiiDii}, navUpdated=${wroteNav})`);

  // Previously this script always exited 0, even when both fetches failed
  // and nothing changed — so your Action would show green with stale data
  // and no signal anything was wrong. Now: if NEITHER source updated on a
  // run where there was no pre-existing data.json, or if BOTH sources
  // errored outright, fail loudly so the Action goes red and you get a
  // notification instead of silently stale data.
  if (fiiDiiError && navError) {
    console.error("\nBoth data sources failed completely this run.");
    if (fiiDiiError.message.includes("403") || navError.message.includes("403")) {
      console.error(
        "One or both failures look like a 403 — NSE's bot protection likely blocks GitHub Actions' " +
          "datacenter IPs. Consider running this from a self-hosted runner or via a residential proxy."
      );
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("build-data.js failed:", err.message);
  process.exit(1);
});

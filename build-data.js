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

async function getSessionCookies() {
  const res = await fetch(BASE, { headers: BROWSER_HEADERS });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("No cookies returned from NSE homepage.");
  return setCookie.split(",").map((c) => c.split(";")[0]).join("; ");
}

async function fetchFiiDii() {
  const cookie = await getSessionCookies();
  const res = await fetch(FII_DII_API, { headers: { ...BROWSER_HEADERS, Cookie: cookie } });
  if (!res.ok) throw new Error(`NSE API responded ${res.status}`);
  const rows = await res.json();
  // rows: [{ category: "FII/FPI *", date: "07-Aug-2026", buyValue, sellValue, netValue }, ...]
  const fiiRow = rows.find((r) => /FII|FPI/i.test(r.category));
  const diiRow = rows.find((r) => /DII/i.test(r.category));
  return {
    date: fiiRow?.date || diiRow?.date || null,
    fiiNet: fiiRow ? Math.round(parseFloat(fiiRow.netValue)) : null,
    diiNet: diiRow ? Math.round(parseFloat(diiRow.netValue)) : null,
  };
}

async function fetchNavFile(names) {
  const res = await fetch(NAV_URL, { headers: { "User-Agent": BROWSER_HEADERS["User-Agent"], Accept: "text/plain,*/*" } });
  if (!res.ok) throw new Error(`AMFI responded ${res.status}`);
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
}

async function main() {
  const outPath = path.join(__dirname, "data.json");
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : null;

  let fiiDiiToday = null;
  try {
    fiiDiiToday = await fetchFiiDii();
    console.log("Fetched FII/DII:", fiiDiiToday);
  } catch (err) {
    console.error("FII/DII fetch failed, keeping previous data:", err.message);
  }

  let navMatches = [];
  const fundNamesToTrack = ["Parag Parikh Flexi Cap", "Quant Small Cap", "ICICI Pru Balanced Adv"];
  try {
    navMatches = await fetchNavFile(fundNamesToTrack);
    console.log("Fetched NAVs:", navMatches.map((s) => `${s.name}: ₹${s.nav}`));
  } catch (err) {
    console.error("NAV fetch failed, keeping previous data:", err.message);
  }

  // Merge onto whatever was there before (or the fallback shape), so a
  // partial failure doesn't wipe out data we already had.
  const base = existing || require("./data.sample.json");

  const merged = JSON.parse(JSON.stringify(base));

  if (fiiDiiToday && fiiDiiToday.fiiNet !== null && fiiDiiToday.diiNet !== null) {
    const day = fiiDiiToday.date || new Date().toISOString().slice(0, 10);
    merged.flowData = [...merged.flowData.slice(-8), { day, fii: fiiDiiToday.fiiNet, dii: fiiDiiToday.diiNet }];
    merged.meta.asOf = day;
  }

  if (navMatches.length) {
    merged.funds = merged.funds.map((f) => {
      const match = navMatches.find((m) => m.name.toLowerCase().includes(f.name.toLowerCase().split(" ")[0]));
      return match ? { ...f, nav: `₹${match.nav}` } : f;
    });
  }

  merged.meta.source = "NSE (FII/DII) + AMFI (fund NAVs); stock watchlist & sector/stock-wise breakdown still sample";

  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((err) => {
  console.error("build-data.js failed:", err.message);
  process.exit(1);
});

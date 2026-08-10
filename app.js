// ---- Fallback sample data ----
// Used only if data.json can't be loaded (offline first run, fetch script
// hasn't been run yet, etc). Once data.json exists, its contents override
// all of this — see loadData() below.
const FALLBACK = {
  flowData: [
    { day: "28 Jul", fii: -1240, dii: 1890 },
    { day: "29 Jul", fii: -890, dii: 1420 },
    { day: "30 Jul", fii: 340, dii: 610 },
    { day: "31 Jul", fii: -2100, dii: 2450 },
    { day: "1 Aug", fii: 1120, dii: -340 },
    { day: "4 Aug", fii: -560, dii: 980 },
    { day: "5 Aug", fii: -1780, dii: 2010 },
    { day: "6 Aug", fii: 210, dii: 340 },
    { day: "7 Aug", fii: -940, dii: 1560 },
  ],
  fiiActivity: {
    buys: [
      { stock: "ICICI Bank", sector: "Banking & Financial", val: 412 },
      { stock: "Bharti Airtel", sector: "Telecom", val: 298 },
      { stock: "L&T", sector: "Infrastructure", val: 176 },
    ],
    sells: [
      { stock: "Reliance Industries", sector: "Energy", val: -520 },
      { stock: "TCS", sector: "IT", val: -344 },
      { stock: "Adani Ports", sector: "Infrastructure", val: -210 },
    ],
  },
  diiActivity: {
    buys: [
      { stock: "HDFC Bank", sector: "Banking & Financial", val: 680 },
      { stock: "Infosys", sector: "IT", val: 415 },
      { stock: "Sun Pharma", sector: "Pharma", val: 260 },
    ],
    sells: [
      { stock: "ITC", sector: "FMCG", val: -190 },
      { stock: "Maruti Suzuki", sector: "Auto", val: -138 },
      { stock: "NTPC", sector: "Power", val: -96 },
    ],
  },
  sectorData: [
    { sector: "Banking & Financial", fii: 250, dii: 890 },
    { sector: "IT", fii: -344, dii: 415 },
    { sector: "Energy", fii: -520, dii: 140 },
    { sector: "Infrastructure", fii: -34, dii: 210 },
    { sector: "Telecom", fii: 298, dii: 60 },
    { sector: "Pharma", fii: 80, dii: 260 },
    { sector: "FMCG", fii: -60, dii: -190 },
    { sector: "Auto", fii: 40, dii: -138 },
  ],
  watchlist: [
    { name: "HDFC Bank", sym: "HDFCBANK", price: "1,678.40", chg: "+1.24%", up: true, pe: "19.8x", mcap: "₹12.8L Cr", roe: "17.2%", divYield: "1.1%", high52: "1,725", low52: "1,430", debtEq: "0.86" },
    { name: "Reliance Industries", sym: "RELIANCE", price: "2,945.10", chg: "-0.38%", up: false, pe: "24.3x", mcap: "₹19.9L Cr", roe: "9.8%", divYield: "0.4%", high52: "3,180", low52: "2,610", debtEq: "0.42" },
    { name: "Infosys", sym: "INFY", price: "1,832.65", chg: "+0.86%", up: true, pe: "27.1x", mcap: "₹7.6L Cr", roe: "31.4%", divYield: "2.6%", high52: "1,955", low52: "1,420", debtEq: "0.09" },
    { name: "Apple Inc.", sym: "AAPL", price: "$228.14", chg: "+0.52%", up: true, pe: "34.2x", mcap: "$3.48T", roe: "151%", divYield: "0.4%", high52: "$237", low52: "$164", debtEq: "1.45" },
    { name: "NVIDIA Corp.", sym: "NVDA", price: "$132.87", chg: "-1.05%", up: false, pe: "48.6x", mcap: "$3.26T", roe: "91.5%", divYield: "0.03%", high52: "$153", low52: "$86", debtEq: "0.13" },
  ],
  funds: [
    { name: "Parag Parikh Flexi Cap", cat: "Flexi Cap", ret1y: "19.6%", ret3y: "22.4%", ret5y: "24.1%", nav: "₹84.62", aum: "₹94,200 Cr", expRatio: "0.63%", sharpe: "1.42", exitLoad: "1% (<1Y)", risk: "Moderate" },
    { name: "Quant Small Cap", cat: "Small Cap", ret1y: "24.1%", ret3y: "31.8%", ret5y: "38.2%", nav: "₹238.90", aum: "₹28,600 Cr", expRatio: "0.58%", sharpe: "1.21", exitLoad: "1% (<1Y)", risk: "High" },
    { name: "Vanguard S&P 500 ETF", cat: "US Large Cap", ret1y: "16.8%", ret3y: "18.1%", ret5y: "15.9%", nav: "$556.30", aum: "$1.4T", expRatio: "0.03%", sharpe: "1.05", exitLoad: "None", risk: "Moderate" },
    { name: "ICICI Pru Balanced Adv.", cat: "Hybrid", ret1y: "11.4%", ret3y: "14.2%", ret5y: "13.6%", nav: "₹68.14", aum: "₹52,900 Cr", expRatio: "0.89%", sharpe: "0.98", exitLoad: "1% (<1Y)", risk: "Low" },
  ],
  meta: { asOf: null, source: "fallback sample data" },
};

// Live-loaded data lands here. Starts as the fallback so the UI has
// something to render immediately; loadData() overwrites it if data.json
// is reachable.
let DATA = FALLBACK;
let flowData = FALLBACK.flowData;
let fiiActivity = FALLBACK.fiiActivity;
let diiActivity = FALLBACK.diiActivity;
let sectorData = FALLBACK.sectorData;
let watchlist = FALLBACK.watchlist;
let funds = FALLBACK.funds;

const stockKeys = [
  ["price", "Price"], ["chg", "1D change"], ["pe", "P/E"], ["mcap", "Market cap"], ["roe", "ROE"],
  ["divYield", "Div. yield"], ["high52", "52W high"], ["low52", "52W low"], ["debtEq", "Debt/Equity"],
];
const fundKeys = [
  ["nav", "NAV"], ["cat", "Category"], ["ret1y", "1Y return"], ["ret3y", "3Y return"], ["ret5y", "5Y return"],
  ["aum", "AUM"], ["expRatio", "Expense ratio"], ["sharpe", "Sharpe ratio"], ["exitLoad", "Exit load"], ["risk", "Risk"],
];

// ---- State ----
const state = {
  tab: "flows",
  flowView: "overview",
  stockView: "list",
  fundView: "list",
  stockDetail: null,
  fundDetail: null,
  stockSel: [],
  fundSel: [],
};

const el = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function arrowSvg(up, size = 14) {
  const points = up ? "18 6 12 12 6 6" : "6 6 12 12 18 18"; // simplified up/down chevrons
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="${up ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline></svg>`;
}

function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";
  app.appendChild(renderTicker());
  const asOf = DATA.meta && DATA.meta.asOf ? `Data as of ${esc(DATA.meta.asOf)}` : "Sample data — run the fetch scripts to load real figures";
  app.appendChild(el(`<div class="header"><h1>MARKET PULSE</h1><p>Institutional flows, stocks &amp; funds — one ledger</p><p style="margin-top:2px;font-size:11px;color:#5C6480">${asOf}</p></div>`));
  app.appendChild(renderTabs());
  const page = el(`<div class="page"></div>`);
  if (state.tab === "flows") page.appendChild(renderFlowsTab());
  if (state.tab === "stocks") page.appendChild(renderListTab("stocks"));
  if (state.tab === "funds") page.appendChild(renderListTab("funds"));
  app.appendChild(page);
}

function renderTicker() {
  const items = [...watchlist, ...watchlist].map(
    (s) => `<span class="ticker-item"><span class="ticker-sym">${esc(s.sym)}</span><span class="${s.up ? "up" : "down"}">${esc(s.chg)}</span></span>`
  ).join("");
  return el(`<div class="ticker"><div class="ticker-track">${items}</div></div>`);
}

function renderTabs() {
  const tabs = [["flows", "FII / DII"], ["stocks", "Stocks"], ["funds", "Funds"]];
  const bar = el(`<div class="tabs"></div>`);
  tabs.forEach(([id, label]) => {
    const btn = el(`<button class="tab-btn ${state.tab === id ? "active" : ""}">${label}</button>`);
    btn.onclick = () => { state.tab = id; render(); };
    bar.appendChild(btn);
  });
  return bar;
}

// ---------- FII/DII tab ----------
function renderFlowsTab() {
  const wrap = el(`<div></div>`);
  const sub = el(`<div class="subtabs"></div>`);
  [["overview", "Overview"], ["stockwise", "By stock"], ["sectorwise", "By sector"]].forEach(([id, label]) => {
    const b = el(`<button class="subtab-btn ${state.flowView === id ? "active" : ""}">${label}</button>`);
    b.onclick = () => { state.flowView = id; render(); };
    sub.appendChild(b);
  });
  wrap.appendChild(sub);

  if (state.flowView === "overview") wrap.appendChild(renderFlowOverview());
  if (state.flowView === "stockwise") wrap.appendChild(renderFlowByStock());
  if (state.flowView === "sectorwise") wrap.appendChild(renderFlowBySector());

  wrap.appendChild(el(`<div class="footnote">Sample data for layout purposes. Live version would pull daily provisional figures &amp; sector tagging from NSE/BSE.</div>`));
  return wrap;
}

function renderFlowOverview() {
  const today = flowData[flowData.length - 1];
  const net = today.fii + today.dii;
  const wrap = el(`<div></div>`);

  const grid = el(`<div class="summary-grid"></div>`);
  [["FII, today", today.fii], ["DII, today", today.dii], ["Net", net]].forEach(([label, val]) => {
    const cls = val >= 0 ? "up" : "down";
    grid.appendChild(el(`
      <div class="card summary-card">
        <div class="summary-label">${label}</div>
        <div class="summary-val ${cls}">${arrowSvg(val >= 0)}${val >= 0 ? "+" : ""}${val.toLocaleString()}<span class="unit">Cr</span></div>
      </div>`));
  });
  wrap.appendChild(grid);

  const maxAbs = Math.max(...flowData.flatMap((d) => [Math.abs(d.fii), Math.abs(d.dii)]));
  const cols = flowData.map((d) => `
    <div class="chart-col">
      <div class="bar-pair">
        <div class="bar fii" style="height:${(Math.max(d.fii,0)/maxAbs*80)}px"></div>
        <div class="bar dii" style="height:${(Math.max(d.dii,0)/maxAbs*80)}px"></div>
      </div>
      <div class="chart-day-label">${esc(d.day)}</div>
    </div>`).join("");

  wrap.appendChild(el(`
    <div class="card chart-card">
      <div class="chart-head">
        <span class="chart-title">Net flow, last 9 sessions (₹ Cr)</span>
        <div class="legend">
          <span><span class="dot" style="background:#E8604C"></span>FII</span>
          <span><span class="dot" style="background:#3DDC97"></span>DII</span>
        </div>
      </div>
      <div class="chart">${cols}</div>
    </div>`));
  return wrap;
}

function activityColumn(label, data, color) {
  const rows = (list, cls) => list.map((s) => `
    <div class="activity-row">
      <div><div>${esc(s.stock)}</div><div class="activity-sector">${esc(s.sector)}</div></div>
      <span class="mono ${cls}">${s.val >= 0 ? "+" : ""}${s.val} Cr</span>
    </div>`).join("");
  return `
    <div class="card">
      <div class="activity-head"><span class="dot" style="background:${color}"></span>${label}</div>
      <div class="activity-body">
        <div class="activity-sub up">▲ Bought</div>
        ${rows(data.buys, "up")}
        <div class="activity-sub down">▼ Sold</div>
        ${rows(data.sells, "down")}
      </div>
    </div>`;
}

function renderFlowByStock() {
  return el(`<div>${activityColumn("FII activity, today", fiiActivity, "#E8604C")}${activityColumn("DII activity, today", diiActivity, "#3DDC97")}</div>`);
}

function renderFlowBySector() {
  const sorted = [...sectorData].sort((a, b) => (b.fii + b.dii) - (a.fii + a.dii));
  const rows = sorted.map((s) => `
    <div class="sector-row">
      <span>${esc(s.sector)}</span>
      <span class="sector-num ${s.fii >= 0 ? "up" : "down"}">${s.fii >= 0 ? "+" : ""}${s.fii}</span>
      <span class="sector-num ${s.dii >= 0 ? "up" : "down"}">${s.dii >= 0 ? "+" : ""}${s.dii}</span>
    </div>`).join("");
  return el(`
    <div class="card">
      <div class="sector-head-row"><span>Sector</span><span style="text-align:right">FII</span><span style="text-align:right">DII</span></div>
      ${rows}
    </div>`);
}

// ---------- Stocks / Funds tabs (shared logic) ----------
function renderListTab(kind) {
  const isStock = kind === "stocks";
  const items = isStock ? watchlist : funds;
  const idKey = isStock ? "sym" : "name";
  const keys = isStock ? stockKeys : fundKeys;
  const viewKey = isStock ? "stockView" : "fundView";
  const selKey = isStock ? "stockSel" : "fundSel";
  const detailKey = isStock ? "stockDetail" : "fundDetail";
  const sel = state[selKey];

  const wrap = el(`<div></div>`);
  const sub = el(`<div class="subtabs"></div>`);
  [["list", "List"], ["compare", `Compare${sel.length ? ` (${sel.length})` : ""}`]].forEach(([id, label]) => {
    const b = el(`<button class="subtab-btn ${state[viewKey] === id ? "active" : ""}">${label}</button>`);
    b.onclick = () => { state[viewKey] = id; render(); };
    sub.appendChild(b);
  });
  wrap.appendChild(sub);

  if (state[viewKey] === "list" && !state[detailKey]) {
    wrap.appendChild(renderList(items, idKey, sel, isStock,
      (id) => { toggleSel(selKey, id); render(); },
      (item) => { state[detailKey] = item; render(); }
    ));
  } else if (state[viewKey] === "list" && state[detailKey]) {
    wrap.appendChild(renderDetail(state[detailKey], keys, () => { state[detailKey] = null; render(); }));
  } else if (state[viewKey] === "compare") {
    const selected = items.filter((it) => sel.includes(it[idKey]));
    wrap.appendChild(renderCompare(selected, idKey, keys, () => { state[selKey] = []; render(); }));
  }

  const note = isStock
    ? "Sample prices &amp; fundamentals. Live version would connect to a market data API."
    : "Sample picks &amp; fundamentals. Live version would pull NAV &amp; returns from AMFI or a fund-data API.";
  wrap.appendChild(el(`<div class="footnote">${note}</div>`));
  return wrap;
}

function toggleSel(selKey, id) {
  const cur = state[selKey];
  if (cur.includes(id)) state[selKey] = cur.filter((x) => x !== id);
  else if (cur.length < 2) state[selKey] = [...cur, id];
  else state[selKey] = [cur[1], id];
}

function renderList(items, idKey, sel, isStock, onToggle, onOpen) {
  const card = el(`<div class="card"></div>`);
  items.forEach((it) => {
    const isSel = sel.includes(it[idKey]);
    const row = el(`<div class="list-row"></div>`);
    const cb = el(`<button class="checkbox ${isSel ? "checked" : ""}"></button>`);
    cb.onclick = () => onToggle(it[idKey]);
    row.appendChild(cb);

    const right = isStock
      ? `<div class="list-price mono">${esc(it.price)}</div><div class="list-chg ${it.up ? "up" : "down"}">${arrowSvg(it.up, 12)}${esc(it.chg)}</div>`
      : `<div class="list-ret mono">${esc(it.ret3y)}</div>`;
    const sub = isStock ? it.sym : it.cat;
    const main = el(`
      <button class="list-main">
        <div><div class="list-name">${esc(it.name)}</div><div class="list-sub">${esc(sub)}</div></div>
        <div class="list-right">${right}</div>
      </button>`);
    main.onclick = () => onOpen(it);
    row.appendChild(main);
    card.appendChild(row);
  });
  return card;
}

function renderDetail(item, keys, onBack) {
  const cells = keys.map(([k, label]) => `
    <div class="detail-cell"><div class="detail-label">${label}</div><div class="detail-val">${esc(item[k] ?? "—")}</div></div>
  `).join("");
  const card = el(`
    <div class="card">
      <div class="detail-head">
        <button class="back-btn">‹</button>
        <div><div class="list-name">${esc(item.name)}</div><div class="list-sub">${esc(item.sym || item.cat)}</div></div>
      </div>
      <div class="detail-grid">${cells}</div>
    </div>`);
  card.querySelector(".back-btn").onclick = onBack;
  return card;
}

function renderCompare(items, idKey, keys, onClear) {
  if (items.length === 0) {
    return el(`<div class="compare-empty">Tap the checkboxes on up to 2 items to compare them here.</div>`);
  }
  const headCols = items.map((it) => `<th>${esc(it.name)}</th>`).join("");
  const rows = keys.map(([k, label]) => `
    <tr><td class="metric">${label}</td>${items.map((it) => `<td class="val">${esc(it[k] ?? "—")}</td>`).join("")}</tr>
  `).join("");
  const card = el(`
    <div class="card">
      <div class="compare-head">
        <span class="chart-title">Comparing ${items.length}</span>
        <button class="clear-btn">✕ Clear</button>
      </div>
      <div style="overflow-x:auto">
        <table class="compare-table">
          <thead><tr><th>Metric</th>${headCols}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`);
  card.querySelector(".clear-btn").onclick = onClear;
  return card;
}

// ---- Load real data.json if present, else keep FALLBACK ----
async function loadData() {
  try {
    const res = await fetch("./data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const json = await res.json();
    if (!json.watchlist || !json.funds || !json.flowData) throw new Error("data.json missing expected fields");
    DATA = json;
    flowData = DATA.flowData;
    fiiActivity = DATA.fiiActivity;
    diiActivity = DATA.diiActivity;
    sectorData = DATA.sectorData;
    watchlist = DATA.watchlist;
    funds = DATA.funds;
  } catch (err) {
    // No data.json yet, or it's malformed — fall back silently to sample data.
    DATA = FALLBACK;
  }
  render();
}

loadData();

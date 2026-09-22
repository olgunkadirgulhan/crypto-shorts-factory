import { fetchJson } from "./lib/http.mjs";

const BASE = "https://api.coingecko.com/api/v3";

const cgHeaders = () =>
  process.env.COINGECKO_API_KEY ? { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY } : {};

const cg = (path) => fetchJson(`${BASE}${path}`, { headers: cgHeaders() });

// Pegged or derivative assets: they mirror another coin, so "analysing" them is noise.
const EXCLUDED = new Set([
  "usdt", "usdc", "dai", "fdusd", "usde", "tusd", "busd", "usds", "pyusd", "usd1", "rlusd", "usdd",
  "steth", "wsteth", "weth", "wbtc", "cbbtc", "wbeth", "weeth", "reth", "rseth", "ezeth", "lbtc",
  "susde", "bsc-usd", "solvbtc", "meth", "sfrxeth", "jitosol", "msol", "bnsol", "wbnb", "clbtc",
]);

export async function fetchMarketContext() {
  const [global, markets, trending] = await Promise.all([
    cg("/global"),
    cg("/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&price_change_percentage=24h"),
    cg("/search/trending"),
  ]);

  const g = global.data;
  return {
    global: {
      totalMarketCapUsd: g.total_market_cap.usd,
      marketCapChange24hPct: round(g.market_cap_change_percentage_24h_usd, 2),
      btcDominancePct: round(g.market_cap_percentage.btc, 1),
      ethDominancePct: round(g.market_cap_percentage.eth, 1),
    },
    markets,
    trendingIds: (trending.coins ?? []).map((c) => c.item.id),
  };
}

// The 08:00 brief always covers BTC, so the other two slots avoid it -
// otherwise two of the three daily videos are the same asset.
const CORE = new Set(["bitcoin", "ethereum"]);

const marketsByIds = (ids) =>
  cg(`/coins/markets?vs_currency=usd&ids=${ids.join(",")}&price_change_percentage=24h`);

function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    if (!c || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

const byAbsMove = (list) =>
  [...list].sort(
    (a, b) => Math.abs(b.price_change_percentage_24h ?? 0) - Math.abs(a.price_change_percentage_24h ?? 0),
  );
const byVolume = (list) => [...list].sort((a, b) => b.total_volume - a.total_volume);

// Picks `count` distinct coins for one video. Each slot has its own strategy
// but all three always return several candidates - a video needs 3 coins, not 1.
export async function pickSubjects(slot, { markets, trendingIds }, excludeIds = [], count = 3) {
  const liquid = markets.filter(
    (c) => !EXCLUDED.has(c.symbol.toLowerCase()) && c.total_volume > 50_000_000,
  );
  const fresh = (list) => list.filter((c) => !excludeIds.includes(c.id));

  let picks = [];

  if (slot === "open") {
    const btc = markets.find((c) => c.id === "bitcoin");
    const eth = markets.find((c) => c.id === "ethereum");
    const movers = byAbsMove(liquid.filter((c) => !CORE.has(c.id)));
    picks = dedupeById([btc, eth, ...fresh(movers)]);
  } else if (slot === "mover") {
    const movers = byAbsMove(liquid.filter((c) => !CORE.has(c.id)));
    picks = dedupeById(fresh(movers));
  } else {
    // Trending coins are often outside the top 100 by market cap - that is the
    // whole point of the slot - so their market rows are fetched by id rather
    // than looked up in the top-100 list.
    const ids = trendingIds.filter((id) => !CORE.has(id)).slice(0, 15);
    const rows = ids.length ? await marketsByIds(ids) : [];
    const pool = rows
      .filter((c) => !EXCLUDED.has(c.symbol.toLowerCase()) && c.total_volume > 10_000_000)
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    picks = dedupeById(fresh(pool));
  }

  // Top up from overall volume leaders if a slot came up short (thin trending
  // list, heavy exclusion history) - always return `count` usable candidates.
  if (picks.length < count) {
    const backfill = byVolume(liquid.filter((c) => slot === "open" || !CORE.has(c.id)));
    picks = dedupeById([...picks, ...fresh(backfill), ...backfill]);
  }

  return picks.slice(0, count);
}

export async function fetchCandles(coinId) {
  const raw = await cg(`/coins/${coinId}/ohlc?vs_currency=usd&days=1`);
  return raw
    .filter((r) => r.every((n) => Number.isFinite(n)))
    .map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

// CoinGecko returns 4-hour candles for a 7-day OHLC window (vs. 30-min for 1-day).
export async function fetchWeeklyCandles(coinId) {
  const raw = await cg(`/coins/${coinId}/ohlc?vs_currency=usd&days=7`);
  return raw
    .filter((r) => r.every((n) => Number.isFinite(n)))
    .map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}

export async function fetchWeeklyMarketContext() {
  const [global, markets] = await Promise.all([
    cg("/global"),
    cg("/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&price_change_percentage=24h,7d"),
  ]);
  const g = global.data;
  return {
    global: {
      totalMarketCapUsd: g.total_market_cap.usd,
      marketCapChange24hPct: round(g.market_cap_change_percentage_24h_usd, 2),
      btcDominancePct: round(g.market_cap_percentage.btc, 1),
      ethDominancePct: round(g.market_cap_percentage.eth, 1),
    },
    markets,
  };
}

// Picks `count` coins for the weekly recap: BTC + ETH always anchor it (a
// market recap that never mentions Bitcoin reads as incomplete), the rest are
// the biggest 7-day movers. A higher volume floor than the daily pickers
// keeps thin, easily-manipulated micro-caps out of a "market pulse" video.
export async function pickWeeklyMovers(markets, excludeIds = [], count = 8) {
  const liquid = markets.filter(
    (c) => !EXCLUDED.has(c.symbol.toLowerCase()) && c.total_volume > 50_000_000,
  );
  const fresh = (list) => list.filter((c) => !excludeIds.includes(c.id));

  const btc = markets.find((c) => c.id === "bitcoin");
  const eth = markets.find((c) => c.id === "ethereum");
  const byAbs7d = [...liquid]
    .filter((c) => !CORE.has(c.id))
    .sort(
      (a, b) =>
        Math.abs(b.price_change_percentage_7d_in_currency ?? 0) -
        Math.abs(a.price_change_percentage_7d_in_currency ?? 0),
    );

  const picks = dedupeById([btc, eth, ...fresh(byAbs7d), ...byAbs7d]);
  return picks.slice(0, count);
}

// Same "fetch candidates + candles together, skip anything too thin" pattern
// as selectSegments, but for the weekly 7-day window.
export async function selectWeeklySegments(context, excludeIds = [], count = 8) {
  const candidates = await pickWeeklyMovers(context.markets, excludeIds, count + 4);
  const result = [];
  for (const coin of candidates) {
    if (result.length === count) break;
    const candles = await fetchWeeklyCandles(coin.id);
    if (candles.length >= 10) {
      result.push({ coin, candles });
    } else {
      console.log(`  ${coin.id} has only ${candles.length} weekly candles, skipping`);
    }
  }
  return result.slice(0, count);
}

// Fetches candidates and their candles together, skipping any coin whose
// history is too thin to chart, until `count` usable coins are assembled.
export async function selectSegments(slot, context, excludeIds = [], count = 3) {
  const candidates = await pickSubjects(slot, context, excludeIds, count + 3);
  const result = [];
  for (const coin of candidates) {
    if (result.length === count) break;
    const candles = await fetchCandles(coin.id);
    if (candles.length >= 16) {
      result.push({ coin, candles });
    } else {
      console.log(`  ${coin.id} has only ${candles.length} candles, skipping`);
    }
  }
  if (result.length < count) {
    for (const id of ["bitcoin", "ethereum", "solana", "ripple"]) {
      if (result.length === count) break;
      if (result.some((r) => r.coin.id === id)) continue;
      const coin = context.markets.find((c) => c.id === id);
      if (!coin) continue;
      const candles = await fetchCandles(id);
      if (candles.length >= 16) result.push({ coin, candles });
    }
  }
  return result.slice(0, count);
}

const round = (n, d) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null);

const round = (n, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : null);

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Wilder's RSI. Needs period+1 closes to produce a first value.
function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const p = candles[i - 1];
    const c = candles[i];
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }
  return sma(trs, Math.min(period, trs.length));
}

// Decimal places that keep a price readable across BTC ($108,431) and SHIB ($0.00002418).
export function priceDecimals(price) {
  const p = Math.abs(price);
  if (p >= 1000) return 0;
  if (p >= 10) return 2;
  if (p >= 1) return 3;
  if (p >= 0.01) return 4;
  if (p >= 0.0001) return 6;
  return 8;
}

export function formatPrice(price) {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: priceDecimals(price),
    maximumFractionDigits: priceDecimals(price),
  });
}

export function formatCompact(n) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

export function computeMetrics(coin, candles) {
  const closes = candles.map((c) => c.c);
  const price = coin.current_price;

  // Full window = ~24h of 30-minute candles; short window = the last ~4 hours.
  const shortWindow = candles.slice(-8);
  const high24h = Math.max(...candles.map((c) => c.h));
  const low24h = Math.min(...candles.map((c) => c.l));
  const resistance = Math.max(...shortWindow.map((c) => c.h));
  const support = Math.min(...shortWindow.map((c) => c.l));

  const sma20 = sma(closes, 20);
  const rsi14 = rsi(closes);
  const atr14 = atr(candles);
  const range = high24h - low24h;

  return {
    price,
    priceText: formatPrice(price),
    change24hPct: round(coin.price_change_percentage_24h, 2),
    high24h,
    low24h,
    high24hText: formatPrice(high24h),
    low24hText: formatPrice(low24h),
    support,
    resistance,
    supportText: formatPrice(support),
    resistanceText: formatPrice(resistance),
    distToResistancePct: round(((resistance - price) / price) * 100, 2),
    distToSupportPct: round(((price - support) / price) * 100, 2),
    rangePositionPct: range > 0 ? round(((price - low24h) / range) * 100, 0) : 50,
    rsi14: round(rsi14, 1),
    rsiZone: rsi14 == null ? "unknown" : rsi14 >= 70 ? "overbought" : rsi14 <= 30 ? "oversold" : "neutral",
    sma20,
    sma20Text: sma20 == null ? null : formatPrice(sma20),
    aboveSma20: sma20 == null ? null : price > sma20,
    volatility24hPct: atr14 == null ? null : round((atr14 / price) * 100, 2),
    volume24hUsd: coin.total_volume,
    volume24hText: formatCompact(coin.total_volume),
    marketCapUsd: coin.market_cap,
    marketCapText: formatCompact(coin.market_cap),
    marketCapRank: coin.market_cap_rank,
    trend: classifyTrend(coin.price_change_percentage_24h, price, sma20),
  };
}

function classifyTrend(change24h, price, sma20) {
  const chg = change24h ?? 0;
  const above = sma20 == null ? chg > 0 : price > sma20;
  if (chg > 4 && above) return "strong uptrend";
  if (chg > 1 && above) return "uptrend";
  if (chg < -4 && !above) return "strong downtrend";
  if (chg < -1 && !above) return "downtrend";
  return "range-bound";
}

export function sentimentOf(metrics) {
  const score =
    (metrics.change24hPct ?? 0) / 3 +
    (metrics.aboveSma20 ? 1 : -1) +
    (metrics.rangePositionPct - 50) / 25;
  if (score > 1.2) return "bullish";
  if (score < -1.2) return "bearish";
  return "neutral";
}

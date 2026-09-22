import type { Candle, WeeklySegment, WeeklyVideoProps } from "./types";

// Only used so `npm run studio` opens with something on screen.
// The real render (pipeline/render-weekly.mjs) generates real market data + voiceover.
function makeCandles(base: number, seed: number): Candle[] {
  return Array.from({ length: 42 }, (_, i) => {
    const wobble = Math.sin(i / 6 + seed) * base * 0.05 + i * base * 0.001;
    const o = base + wobble;
    const c = base + wobble + Math.cos(i / 5 + seed) * base * 0.012;
    return {
      t: Date.now() - (42 - i) * 4 * 3600000,
      o,
      c,
      h: Math.max(o, c) + base * 0.008,
      l: Math.min(o, c) - base * 0.008,
    };
  });
}

function makeSegment(opts: {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceText: string;
  change7d: number;
  rank: number;
  seed: number;
  startSec: number;
  endSec: number;
}): WeeklySegment {
  const candles = makeCandles(opts.price, opts.seed);
  const weekHigh = opts.price * 1.14;
  const weekLow = opts.price * 0.88;
  return {
    coin: { id: opts.id, name: opts.name, symbol: opts.symbol, image: "" },
    candles,
    logoFile: null,
    startSec: opts.startSec,
    endSec: opts.endSec,
    metrics: {
      price: opts.price,
      priceText: opts.priceText,
      change7dPct: opts.change7d,
      change24hPct: opts.change7d / 5,
      weekHigh,
      weekLow,
      weekHighText: weekHigh.toFixed(0),
      weekLowText: weekLow.toFixed(0),
      rangePositionPct: 58,
      rsi14: 56.2,
      rsiZone: "neutral",
      sma20: opts.price * 0.97,
      sma20Text: (opts.price * 0.97).toFixed(0),
      aboveSma20: true,
      volume24hUsd: 900_000_000,
      volume24hText: "900.0M",
      marketCapUsd: 30_000_000_000,
      marketCapText: "30.0B",
      marketCapRank: opts.rank,
      trend: opts.change7d >= 0 ? "uptrend" : "downtrend",
    },
  };
}

const coins = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", price: 106200, priceText: "106,200", change7d: 6.4, rank: 1 },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", price: 3412, priceText: "3,412", change7d: 4.1, rank: 2 },
  { id: "solana", name: "Solana", symbol: "SOL", price: 198.4, priceText: "198.40", change7d: 18.2, rank: 5 },
  { id: "ripple", name: "XRP", symbol: "XRP", price: 2.31, priceText: "2.31", change7d: -8.4, rank: 6 },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", price: 0.21, priceText: "0.2100", change7d: 22.7, rank: 9 },
  { id: "cardano", name: "Cardano", symbol: "ADA", price: 0.58, priceText: "0.5800", change7d: -11.3, rank: 11 },
];

const overviewLines = [
  "This week the total crypto market cap climbed a little over four percent.",
  "Bitcoin dominance held steady near fifty nine percent of the entire market.",
  "Overall risk appetite stayed firm, with alt coins outpacing majors on average.",
  "Here is a look at the biggest movers from the past seven days.",
];

function coinLines(name: string, change: number) {
  const dir = change >= 0 ? "gained" : "lost";
  return [
    `${name} ${dir} ${Math.abs(change)} percent this week, trading near its recent range.`,
    "R S I sits in neutral territory, with price holding above its twenty period average.",
    "Volume stayed steady through the week without any single standout spike day.",
    "It closed out the week broadly in line with the rest of the market.",
  ];
}

const cta = "Hit follow and drop a like so you never miss next week's recap.";

let t = 3;
const captions: WeeklyVideoProps["captions"] = [];
for (const line of overviewLines) {
  captions.push({ text: line, start: t, duration: 4.4 });
  t += 4.7;
}
for (const c of coins) {
  for (const line of coinLines(c.name, c.change7d)) {
    captions.push({ text: line, start: t, duration: 4.3 });
    t += 4.6;
  }
}
captions.push({ text: cta, start: t, duration: 4.6 });
t += 5.6;

const segments: WeeklySegment[] = [];
let cursor = 3 + overviewLines.length * 4.7;
coins.forEach((c, i) => {
  const start = cursor;
  const end = cursor + 4 * 4.6;
  segments.push(
    makeSegment({
      ...c,
      seed: i * 2,
      startSec: start,
      endSec: end,
    }),
  );
  cursor = end;
});

export const weeklySampleProps: WeeklyVideoProps = {
  hook: "This Week in Crypto",
  takeaway: "Majors steady, alt coins led the week",
  ctaText: cta,
  global: { totalMarketCapUsd: 2_950_000_000_000, marketCapChange24hPct: 1.4, btcDominancePct: 59.1, ethDominancePct: 11.6 },
  segments,
  captions,
  durationSec: t,
  audioFile: null,
};

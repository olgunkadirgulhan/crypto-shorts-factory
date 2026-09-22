import type { CoinSegment, ShortProps } from "./types";

// Only used so `npm run studio` opens with something on screen.
// The pipeline always overrides these via --props=out/props.json.
function makeCandles(base: number, seed: number) {
  return Array.from({ length: 36 }, (_, i) => {
    const wobble = Math.sin(i / 4 + seed) * base * 0.018 + i * base * 0.0007;
    const o = base + wobble;
    const c = base + wobble + Math.cos(i / 3 + seed) * base * 0.005;
    return {
      t: Date.now() - (36 - i) * 1800000,
      o,
      c,
      h: Math.max(o, c) + base * 0.003,
      l: Math.min(o, c) - base * 0.003,
    };
  });
}

function makeSegment(opts: {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceText: string;
  change: number;
  seed: number;
  rank: number;
  sentiment: CoinSegment["sentiment"];
  startSec: number;
  endSec: number;
}): CoinSegment {
  const candles = makeCandles(opts.price, opts.seed);
  const support = opts.price * 0.988;
  const resistance = opts.price * 1.012;
  return {
    coin: { id: opts.id, name: opts.name, symbol: opts.symbol, image: "" },
    candles,
    sentiment: opts.sentiment,
    logoFile: null,
    startSec: opts.startSec,
    endSec: opts.endSec,
    metrics: {
      price: opts.price,
      priceText: opts.priceText,
      change24hPct: opts.change,
      high24h: opts.price * 1.03,
      low24h: opts.price * 0.97,
      high24hText: (opts.price * 1.03).toFixed(0),
      low24hText: (opts.price * 0.97).toFixed(0),
      support,
      resistance,
      supportText: support.toFixed(support < 10 ? 4 : 0),
      resistanceText: resistance.toFixed(resistance < 10 ? 4 : 0),
      distToResistancePct: 1.2,
      distToSupportPct: 0.8,
      rangePositionPct: 60,
      rsi14: 58.4,
      rsiZone: "neutral",
      sma20: opts.price * 0.995,
      sma20Text: (opts.price * 0.995).toFixed(0),
      aboveSma20: true,
      volatility24hPct: 0.7,
      volume24hUsd: 1_200_000_000,
      volume24hText: "1.2B",
      marketCapUsd: 40_000_000_000,
      marketCapText: "40.0B",
      marketCapRank: opts.rank,
      trend: opts.change >= 0 ? "uptrend" : "downtrend",
    },
  };
}

const captions = [
  { text: "Bitcoin is trading at one hundred and six thousand dollars right now.", start: 0.2, duration: 4.4 },
  { text: "That is up one point eight percent over the past twenty four hours.", start: 4.9, duration: 4.3 },
  { text: "Ethereum is holding around three thousand four hundred dollars today.", start: 9.5, duration: 4.1 },
  { text: "R S I sits at fifty eight, right in neutral territory.", start: 13.9, duration: 3.6 },
  { text: "Solana jumped eleven percent and is testing its four hour high.", start: 17.8, duration: 4.2 },
  { text: "Volume is running well above its recent daily average.", start: 22.3, duration: 3.4 },
  {
    text: "Hit follow and drop a like so you never miss the next breakdown.",
    start: 26.0,
    duration: 4.8,
  },
];

export const sampleProps: ShortProps = {
  slot: "open",
  style: "panel",
  hook: "3 Coins Moving Right Now",
  takeaway: "Majors steady, Solana leading the tape",
  ctaText: captions[6].text,
  captions,
  durationSec: 31.8,
  audioFile: null,
  generatedAt: new Date().toISOString(),
  segments: [
    makeSegment({
      id: "bitcoin",
      name: "Bitcoin",
      symbol: "BTC",
      price: 106200,
      priceText: "106,200",
      change: 1.8,
      seed: 0,
      rank: 1,
      sentiment: "bullish",
      startSec: 0,
      endSec: 9.2,
    }),
    makeSegment({
      id: "ethereum",
      name: "Ethereum",
      symbol: "ETH",
      price: 3412,
      priceText: "3,412",
      change: 0.6,
      seed: 2,
      rank: 2,
      sentiment: "neutral",
      startSec: 9.2,
      endSec: 17.5,
    }),
    makeSegment({
      id: "solana",
      name: "Solana",
      symbol: "SOL",
      price: 198.4,
      priceText: "198.40",
      change: 11.2,
      seed: 4,
      rank: 5,
      sentiment: "bullish",
      startSec: 17.5,
      endSec: 25.7,
    }),
  ],
};

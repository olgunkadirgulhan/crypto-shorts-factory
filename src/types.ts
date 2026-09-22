export type Candle = { t: number; o: number; h: number; l: number; c: number };

export type Caption = { text: string; start: number; duration: number };

export type CoinInfo = { id: string; name: string; symbol: string; image: string };

export type Metrics = {
  price: number;
  priceText: string;
  change24hPct: number | null;
  high24h: number;
  low24h: number;
  high24hText: string;
  low24hText: string;
  support: number;
  resistance: number;
  supportText: string;
  resistanceText: string;
  distToResistancePct: number | null;
  distToSupportPct: number | null;
  rangePositionPct: number;
  rsi14: number | null;
  rsiZone: string;
  sma20: number | null;
  sma20Text: string | null;
  aboveSma20: boolean | null;
  volatility24hPct: number | null;
  volume24hUsd: number;
  volume24hText: string;
  marketCapUsd: number;
  marketCapText: string;
  marketCapRank: number | null;
  trend: string;
};

export type CoinSegment = {
  coin: CoinInfo;
  metrics: Metrics;
  candles: Candle[];
  sentiment: "bullish" | "bearish" | "neutral";
  logoFile: string | null;
  // Seconds into the video this coin's panel is on screen. Boundaries are
  // shared with the neighboring segment so panels cut with no gap or overlap.
  startSec: number;
  endSec: number;
};

export type ShortProps = {
  slot: "open" | "mover" | "trending";
  style: "panel" | "spotlight";
  hook: string;
  takeaway: string;
  ctaText: string;
  segments: CoinSegment[];
  captions: Caption[];
  durationSec: number;
  audioFile: string | null;
  generatedAt: string;
};

export const SLOT_LABEL: Record<ShortProps["slot"], string> = {
  open: "MARKET BRIEF",
  mover: "MOVER OF THE DAY",
  trending: "TRENDING NOW",
};

export type TrailerCardSpec = {
  icon: "shield" | "lock" | "search" | "bars" | null;
  eyebrow: string;
  headline: string;
};

export type TrailerProps = {
  cards: TrailerCardSpec[]; // card[0] renders as the brand intro (icon/eyebrow ignored)
  takeaway: string;
  captions: Caption[];
  durationSec: number;
  audioFile: string | null;
};

export type WeeklyGlobal = {
  totalMarketCapUsd: number;
  marketCapChange24hPct: number;
  btcDominancePct: number;
  ethDominancePct: number;
};

export type WeeklyMetrics = {
  price: number;
  priceText: string;
  change7dPct: number | null;
  change24hPct: number | null;
  weekHigh: number;
  weekLow: number;
  weekHighText: string;
  weekLowText: string;
  rangePositionPct: number;
  rsi14: number | null;
  rsiZone: string;
  sma20: number | null;
  sma20Text: string | null;
  aboveSma20: boolean | null;
  volume24hUsd: number;
  volume24hText: string;
  marketCapUsd: number;
  marketCapText: string;
  marketCapRank: number | null;
  trend: string;
};

export type WeeklySegment = {
  coin: CoinInfo;
  metrics: WeeklyMetrics;
  candles: Candle[];
  logoFile: string | null;
  startSec: number;
  endSec: number;
};

export type WeeklyVideoProps = {
  hook: string;
  takeaway: string;
  ctaText: string;
  global: WeeklyGlobal;
  segments: WeeklySegment[];
  captions: Caption[];
  durationSec: number;
  audioFile: string | null;
};

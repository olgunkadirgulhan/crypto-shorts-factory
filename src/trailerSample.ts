import type { TrailerProps } from "./types";

// Only used so `npm run studio` opens with something on screen.
// The real render (pipeline/render-trailer.mjs) generates real voiceover timings.
const lines = [
  "Welcome to Whale Market Pulse, your daily crypto market data breakdown.",
  "Everything here is data and analysis, never financial advice or signals.",
  "Only ever risk money you can genuinely afford to lose completely.",
  "Always verify independently, and never trade off a single video.",
  "Markets swing hard in both directions, so protect your capital first.",
  "Hit follow and join traders who think clearly, not emotionally.",
];

export const trailerSampleProps: TrailerProps = {
  cards: [
    { icon: null, eyebrow: "", headline: "" }, // card 0 renders as BrandIntro instead
    { icon: "shield", eyebrow: "OUR PROMISE", headline: "Data and analysis — never advice" },
    { icon: "lock", eyebrow: "RISK MANAGEMENT", headline: "Only risk what you can afford" },
    { icon: "search", eyebrow: "DO YOUR OWN RESEARCH", headline: "Always verify independently" },
    { icon: "bars", eyebrow: "STAY PROTECTED", headline: "Volatility cuts both ways" },
  ],
  takeaway: "Clear Data. Smart Trading.",
  captions: lines.map((text, i) => ({ text, start: 2.5 + i * 4.6, duration: 4.2 })),
  durationSec: 33,
  audioFile: null,
};

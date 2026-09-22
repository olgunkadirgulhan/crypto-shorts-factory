import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { CandleChart } from "./CandleChart";
import { Header } from "./Header";
import { HeroPrice } from "./HeroPrice";
import { StatTiles } from "./StatTiles";
import type { CoinSegment, ShortProps } from "../types";

const FADE_FRAMES = 10;

type Props = {
  slot: ShortProps["slot"];
  segment: CoinSegment;
  index: number;
  total: number;
  // The Sequence's own length in frames - useVideoConfig() would return the
  // whole composition's length instead, so the parent passes this explicitly.
  durationInFrames: number;
};

export const CoinPanel: React.FC<Props> = ({ slot, segment, index, total, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const chartProgress = interpolate(frame, [0, 44], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ paddingTop: 96, opacity: Math.min(fadeIn, fadeOut) }}>
      <Header
        slot={slot}
        coin={segment.coin}
        logoFile={segment.logoFile}
        rank={segment.metrics.marketCapRank}
        index={index}
        total={total}
      />
      <HeroPrice
        priceText={segment.metrics.priceText}
        changePct={segment.metrics.change24hPct}
        trend={segment.metrics.trend}
      />
      <div style={{ marginTop: 30, paddingLeft: 36 }}>
        <CandleChart
          candles={segment.candles}
          width={1008}
          height={508}
          price={segment.metrics.price}
          support={segment.metrics.support}
          resistance={segment.metrics.resistance}
          supportText={segment.metrics.supportText}
          resistanceText={segment.metrics.resistanceText}
          priceText={segment.metrics.priceText}
          progress={chartProgress}
        />
      </div>
      <div style={{ marginTop: 22 }}>
        <StatTiles metrics={segment.metrics} />
      </div>
    </AbsoluteFill>
  );
};

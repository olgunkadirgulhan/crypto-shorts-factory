import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Header } from "./Header";
import { Sparkline } from "./Sparkline";
import { dirColor, dirGlyph, numeric, theme } from "../theme";
import type { CoinSegment, ShortProps } from "../types";

const FADE_FRAMES = 10;

type Props = {
  slot: ShortProps["slot"];
  segment: CoinSegment;
  index: number;
  total: number;
  durationInFrames: number;
};

// A faster, less data-dense alternative to CoinPanel: one giant price, a
// simple trend line instead of full candlesticks, one headline stat instead
// of a tile grid. Selected at random per video (see run.mjs) so the channel
// doesn't publish one visually identical template every time.
export const SpotlightPanel: React.FC<Props> = ({ slot, segment, index, total, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const priceEnter = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 26 });
  const sparkProgress = interpolate(frame, [10, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const statEnter = spring({ frame: frame - 40, fps, config: { damping: 200 }, durationInFrames: 18 });

  const m = segment.metrics;
  const up = (m.change24hPct ?? 0) >= 0;
  const highlight =
    m.rsi14 != null
      ? { label: "RSI (14)", value: `${m.rsi14}`, note: m.rsiZone.toUpperCase() }
      : { label: "POSITION IN 24H RANGE", value: `${m.rangePositionPct}%`, note: m.trend.toUpperCase() };

  return (
    <AbsoluteFill style={{ paddingTop: 96, opacity: Math.min(fadeIn, fadeOut) }}>
      <Header slot={slot} coin={segment.coin} logoFile={segment.logoFile} rank={m.marketCapRank} index={index} total={total} />

      <AbsoluteFill style={{ top: 220, bottom: 260, alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            textAlign: "center",
            opacity: priceEnter,
            transform: `scale(${interpolate(priceEnter, [0, 1], [0.88, 1])})`,
          }}
        >
          <div style={{ color: theme.ink, fontSize: 148, fontWeight: 900, lineHeight: 1, letterSpacing: -4, ...numeric }}>
            ${m.priceText}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 22 }}>
            <span style={{ color: dirColor(up), fontSize: 40 }}>{dirGlyph(up)}</span>
            <span style={{ color: dirColor(up), fontSize: 56, fontWeight: 900, ...numeric }}>
              {up ? "+" : ""}
              {m.change24hPct ?? 0}%
            </span>
            <span style={{ color: theme.inkMuted, fontSize: 30, fontWeight: 700 }}>24H</span>
          </div>
        </div>

        <div style={{ width: 1008, marginTop: 56 }}>
          <Sparkline
            candles={segment.candles}
            width={1008}
            height={340}
            support={m.support}
            resistance={m.resistance}
            supportText={m.supportText}
            resistanceText={m.resistanceText}
            up={up}
            progress={sparkProgress}
          />
        </div>

        <div
          style={{
            marginTop: 48,
            display: "inline-flex",
            alignItems: "center",
            gap: 22,
            padding: "22px 40px",
            borderRadius: 22,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.hairline}`,
            opacity: statEnter,
            transform: `translateY(${interpolate(statEnter, [0, 1], [16, 0])}px)`,
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ color: theme.inkMuted, fontSize: 19, fontWeight: 800, letterSpacing: 1.4 }}>
              {highlight.label}
            </div>
            <div style={{ color: theme.ink, fontSize: 46, fontWeight: 900, ...numeric }}>{highlight.value}</div>
          </div>
          <div style={{ width: 1, height: 44, backgroundColor: theme.hairline }} />
          <div style={{ color: theme.inkSecondary, fontSize: 24, fontWeight: 800, letterSpacing: 0.8 }}>
            {highlight.note}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

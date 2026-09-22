import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { dirColor, dirGlyph, numeric, theme } from "../theme";
import type { WeeklyGlobal } from "../types";

const formatCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);

const FADE_FRAMES = 10;

type Props = {
  hook: string;
  global: WeeklyGlobal;
  tint: string;
  durationInFrames: number;
};

// Landscape opening card: the week's overall market mood, before diving into
// individual coins - plays under the 3-sentence spoken overview.
export const WeeklyIntro: React.FC<Props> = ({ hook, global, tint, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeOut = interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  const up = global.marketCapChange24hPct >= 0;

  const stats = [
    { label: "TOTAL MARKET CAP", value: `$${formatCompact(global.totalMarketCapUsd)}` },
    { label: "BTC DOMINANCE", value: `${global.btcDominancePct}%` },
    { label: "ETH DOMINANCE", value: `${global.ethDominancePct}%` },
  ];

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 120px",
        opacity: Math.min(enter, fadeOut),
      }}
    >
      <div style={{ textAlign: "center", transform: `translateY(${interpolate(enter, [0, 1], [22, 0])}px)` }}>
        <div style={{ color: tint, fontSize: 26, fontWeight: 900, letterSpacing: 4 }}>WEEKLY MARKET PULSE</div>
        <div
          style={{
            color: theme.ink,
            fontSize: 88,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            marginTop: 18,
          }}
        >
          {hook}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            marginTop: 28,
            padding: "14px 26px",
            borderRadius: 16,
            backgroundColor: `${dirColor(up)}1c`,
            border: `1px solid ${dirColor(up)}59`,
          }}
        >
          <span style={{ color: dirColor(up), fontSize: 26 }}>{dirGlyph(up)}</span>
          <span style={{ color: dirColor(up), fontSize: 34, fontWeight: 900, ...numeric }}>
            {up ? "+" : ""}
            {global.marketCapChange24hPct}%
          </span>
          <span style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700 }}>MARKET CAP, 24H</span>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 40, justifyContent: "center" }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                padding: "18px 30px",
                borderRadius: 18,
                backgroundColor: theme.surface,
                border: `1px solid ${theme.hairline}`,
                minWidth: 220,
              }}
            >
              <div style={{ color: theme.inkMuted, fontSize: 16, fontWeight: 800, letterSpacing: 1.2 }}>
                {s.label}
              </div>
              <div style={{ color: theme.ink, fontSize: 38, fontWeight: 900, marginTop: 6, ...numeric }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

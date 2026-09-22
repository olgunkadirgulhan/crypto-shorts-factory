import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CandleChart } from "./CandleChart";
import { dirColor, dirGlyph, numeric, theme } from "../theme";
import type { WeeklySegment } from "../types";

const FADE_FRAMES = 10;

type Props = {
  segment: WeeklySegment;
  index: number;
  total: number;
  durationInFrames: number;
};

// Landscape (1920x1080) layout for the weekly recap: identity + price + stats
// on the left, the week's chart on the right - unlike the vertical Shorts
// panel, which stacks everything in one column.
export const WeeklyCoinPanel: React.FC<Props> = ({ segment, index, total, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
  const chartProgress = interpolate(frame, [8, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const m = segment.metrics;
  const up = (m.change7dPct ?? 0) >= 0;

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), padding: "64px 72px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [-20, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 999,
            backgroundColor: theme.surfaceRaised,
            border: `1px solid ${theme.hairline}`,
          }}
        >
          <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: theme.downText }} />
          <span style={{ color: theme.inkSecondary, fontSize: 20, fontWeight: 800, letterSpacing: 2 }}>
            WEEKLY MARKET PULSE
          </span>
        </div>
        <div
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            backgroundColor: theme.surfaceRaised,
            border: `1px solid ${theme.hairline}`,
            color: theme.amberText,
            fontSize: 18,
            fontWeight: 900,
          }}
        >
          {index} / {total}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, marginTop: 36, gap: 64 }}>
        <div style={{ width: 660, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              opacity: enter,
              transform: `translateY(${interpolate(enter, [0, 1], [16, 0])}px)`,
            }}
          >
            {segment.logoFile ? (
              <Img src={staticFile(segment.logoFile)} style={{ width: 76, height: 76, borderRadius: 999 }} />
            ) : (
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 999,
                  backgroundColor: theme.surfaceRaised,
                  border: `1px solid ${theme.hairline}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.ink,
                  fontSize: 28,
                  fontWeight: 900,
                }}
              >
                {segment.coin.symbol.slice(0, 3)}
              </div>
            )}
            <div>
              <div style={{ color: theme.ink, fontSize: 42, fontWeight: 900, lineHeight: 1.05 }}>
                {segment.coin.name}
              </div>
              <div style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
                {segment.coin.symbol}
                {m.marketCapRank ? ` · RANK #${m.marketCapRank}` : ""}
              </div>
            </div>
          </div>

          <div
            style={{
              color: theme.ink,
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: -2,
              marginTop: 28,
              ...numeric,
            }}
          >
            ${m.priceText}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 14,
                backgroundColor: `${dirColor(up)}1c`,
                border: `1px solid ${dirColor(up)}59`,
              }}
            >
              <span style={{ color: dirColor(up), fontSize: 26 }}>{dirGlyph(up)}</span>
              <span style={{ color: dirColor(up), fontSize: 34, fontWeight: 900, ...numeric }}>
                {up ? "+" : ""}
                {m.change7dPct ?? 0}%
              </span>
            </div>
            <span style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700 }}>THIS WEEK</span>
          </div>
          {m.change24hPct != null && (
            <div style={{ color: theme.inkSecondary, fontSize: 20, fontWeight: 700, marginTop: 8 }}>
              {m.change24hPct >= 0 ? "+" : ""}
              {m.change24hPct}% in the last 24h
            </div>
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 32 }}>
            <StatCard label="RSI (14)" value={m.rsi14 == null ? "—" : String(m.rsi14)} note={m.rsiZone.toUpperCase()} />
            <StatCard label="TREND" value={m.trend.split(" ")[0].toUpperCase()} note={m.trend.toUpperCase()} />
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <CandleChart
            candles={segment.candles}
            width={1080}
            height={680}
            price={m.price}
            support={m.weekLow}
            resistance={m.weekHigh}
            supportText={m.weekLowText}
            resistanceText={m.weekHighText}
            priceText={m.priceText}
            progress={chartProgress}
            highLabel="WEEK HIGH"
            lowLabel="WEEK LOW"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const StatCard: React.FC<{ label: string; value: string; note: string }> = ({ label, value, note }) => (
  <div
    style={{
      backgroundColor: theme.surface,
      border: `1px solid ${theme.hairline}`,
      borderRadius: 18,
      padding: "16px 22px",
      minWidth: 180,
    }}
  >
    <div style={{ color: theme.inkMuted, fontSize: 16, fontWeight: 800, letterSpacing: 1.2 }}>{label}</div>
    <div style={{ color: theme.ink, fontSize: 34, fontWeight: 900, marginTop: 4, ...numeric }}>{value}</div>
    <div style={{ color: theme.inkSecondary, fontSize: 15, fontWeight: 700, marginTop: 4 }}>{note}</div>
  </div>
);

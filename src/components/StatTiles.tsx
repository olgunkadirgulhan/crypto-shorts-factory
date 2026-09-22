import React from "react";
import { spring, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { numeric, theme } from "../theme";
import type { Metrics } from "../types";

export const StatTiles: React.FC<{ metrics: Metrics }> = ({ metrics }) => {
  const tiles = [
    {
      label: "RSI (14)",
      value: metrics.rsi14 == null ? "--" : String(metrics.rsi14),
      note: metrics.rsiZone.toUpperCase(),
      meter: metrics.rsi14 == null ? null : metrics.rsi14 / 100,
    },
    {
      label: "POSITION IN 24H RANGE",
      value: `${metrics.rangePositionPct}%`,
      note: `LOW $${metrics.low24hText} · HIGH $${metrics.high24hText}`,
      meter: metrics.rangePositionPct / 100,
    },
    {
      label: "24H VOLUME",
      value: `$${metrics.volume24hText}`,
      note: `MKT CAP $${metrics.marketCapText}`,
      meter: null,
    },
    {
      label: "VOLATILITY (ATR)",
      value: metrics.volatility24hPct == null ? "--" : `${metrics.volatility24hPct}%`,
      note: metrics.sma20Text ? `20-SMA $${metrics.sma20Text}` : "",
      meter: null,
    },
  ];

  return (
    <div
      style={{
        padding: "0 56px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20,
      }}
    >
      {tiles.map((tile, i) => (
        <Tile key={tile.label} index={i} {...tile} />
      ))}
    </div>
  );
};

const Tile: React.FC<{
  index: number;
  label: string;
  value: string;
  note: string;
  meter: number | null;
}> = ({ index, label, value, note, meter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - index * 3,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  return (
    <div
      style={{
        backgroundColor: theme.surface,
        border: `1px solid ${theme.hairline}`,
        borderRadius: 22,
        padding: "22px 24px 24px",
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [18, 0])}px)`,
      }}
    >
      <div
        style={{
          color: theme.inkMuted,
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: 1.5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: theme.ink,
          fontSize: 58,
          fontWeight: 900,
          marginTop: 8,
          lineHeight: 1,
          ...numeric,
        }}
      >
        {value}
      </div>
      {meter != null && (
        <div
          style={{
            height: 6,
            borderRadius: 999,
            backgroundColor: theme.surfaceRaised,
            marginTop: 14,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.max(0, Math.min(1, meter)) * 100 * enter}%`,
              borderRadius: 999,
              backgroundColor: theme.blueMark,
            }}
          />
        </div>
      )}
      <div
        style={{
          color: theme.inkSecondary,
          fontSize: 19,
          fontWeight: 700,
          marginTop: 12,
          letterSpacing: 0.6,
          ...numeric,
        }}
      >
        {note}
      </div>
    </div>
  );
};

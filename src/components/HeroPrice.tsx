import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { dirColor, dirGlyph, numeric, theme } from "../theme";

type Props = { priceText: string; changePct: number | null; trend: string };

export const HeroPrice: React.FC<Props> = ({ priceText, changePct, trend }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const up = (changePct ?? 0) >= 0;

  return (
    <div style={{ padding: "0 56px", marginTop: 34, opacity: enter }}>
      <div
        style={{
          color: theme.ink,
          fontSize: 132,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -3,
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
          transformOrigin: "left center",
          ...numeric,
        }}
      >
        ${priceText}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 20 }}>
        {/* Glyph + sign carry direction without relying on color. */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 24px",
            borderRadius: 16,
            backgroundColor: `${dirColor(up)}1c`,
            border: `1px solid ${dirColor(up)}59`,
          }}
        >
          <span style={{ color: dirColor(up), fontSize: 34 }}>{dirGlyph(up)}</span>
          <span
            style={{ color: dirColor(up), fontSize: 50, fontWeight: 900, ...numeric }}
          >
            {up ? "+" : ""}
            {changePct ?? 0}%
          </span>
        </div>
        <span style={{ color: theme.inkMuted, fontSize: 28, fontWeight: 700 }}>24H</span>
        <span
          style={{
            color: theme.inkSecondary,
            fontSize: 28,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1.4,
          }}
        >
          {trend}
        </span>
      </div>
    </div>
  );
};

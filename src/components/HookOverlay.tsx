import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { dirColor, dirGlyph, numeric, theme } from "../theme";
import { SLOT_LABEL, type ShortProps } from "../types";

type WatchItem = { symbol: string; changePct: number | null };

type Props = {
  slot: ShortProps["slot"];
  hook: string;
  segments: WatchItem[];
  tint: string;
  // The Hook Sequence's own length in frames - useVideoConfig() would return
  // the whole composition's length instead, so the parent passes this explicitly.
  durationInFrames: number;
};

export const HookOverlay: React.FC<Props> = ({ slot, hook, segments, tint, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });
  const exit = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        opacity: exit,
        justifyContent: "center",
        padding: "0 72px",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at 50% 42%, ${tint}38, transparent 72%)`,
        }}
      />
      <div style={{ opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)` }}>
        <div style={{ color: tint, fontSize: 28, fontWeight: 900, letterSpacing: 4 }}>
          {SLOT_LABEL[slot]}
        </div>
        <div
          style={{
            color: theme.ink,
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            marginTop: 22,
          }}
        >
          {hook}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 40 }}>
          {segments.map((s, i) => {
            const up = (s.changePct ?? 0) >= 0;
            const itemEnter = spring({
              frame: frame - 8 - i * 5,
              fps,
              config: { damping: 200 },
              durationInFrames: 16,
            });
            return (
              <div
                key={s.symbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 28px",
                  borderRadius: 18,
                  backgroundColor: theme.surfaceRaised,
                  border: `1px solid ${theme.hairline}`,
                  opacity: itemEnter,
                  transform: `translateX(${interpolate(itemEnter, [0, 1], [-24, 0])}px)`,
                }}
              >
                <span style={{ color: theme.ink, fontSize: 34, fontWeight: 900, letterSpacing: 0.5 }}>
                  {s.symbol}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: dirColor(up), fontSize: 24 }}>{dirGlyph(up)}</span>
                  <span style={{ color: dirColor(up), fontSize: 34, fontWeight: 900, ...numeric }}>
                    {up ? "+" : ""}
                    {s.changePct ?? 0}%
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

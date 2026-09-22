import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { Caption } from "../types";

export const Captions: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const index = captions.findIndex((c) => t >= c.start && t < c.start + c.duration);
  const active = index >= 0 ? captions[index] : null;
  if (!active) return null;

  const local = t - active.start;
  const opacity = interpolate(
    local,
    [0, 0.18, active.duration - 0.18, active.duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const lift = interpolate(local, [0, 0.3], [14, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ padding: "0 64px", opacity, transform: `translateY(${lift}px)` }}>
      <div
        style={{
          color: theme.ink,
          fontSize: 46,
          fontWeight: 800,
          lineHeight: 1.24,
          textAlign: "center",
          textShadow: "0 4px 24px rgba(0,0,0,0.75)",
        }}
      >
        {active.text}
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginTop: 26,
        }}
      >
        {captions.map((c, i) => (
          <div
            key={c.start}
            style={{
              width: i === index ? 40 : 14,
              height: 5,
              borderRadius: 999,
              backgroundColor: i === index ? theme.amberText : theme.hairline,
            }}
          />
        ))}
      </div>
    </div>
  );
};

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const FADE_FRAMES = 10;

export const BrandIntro: React.FC<{ tint: string; durationInFrames: number }> = ({ tint, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeOut = interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  const scale = interpolate(enter, [0, 1], [0.9, 1]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 60px",
        opacity: Math.min(enter, fadeOut),
      }}
    >
      <div style={{ textAlign: "center", transform: `scale(${scale})` }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 26px",
            borderRadius: 999,
            backgroundColor: theme.surfaceRaised,
            border: `1px solid ${theme.hairline}`,
            marginBottom: 30,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: tint }} />
          <span style={{ color: theme.inkSecondary, fontSize: 22, fontWeight: 800, letterSpacing: 2.2 }}>
            WELCOME TO
          </span>
        </div>
        <div
          style={{
            color: theme.ink,
            fontSize: 92,
            fontWeight: 900,
            lineHeight: 1.02,
            letterSpacing: -2,
          }}
        >
          Whale Market
          <br />
          Pulse
        </div>
        <div
          style={{
            color: tint,
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 1,
            marginTop: 26,
          }}
        >
          Daily Crypto Market Data
        </div>
      </div>
    </AbsoluteFill>
  );
};

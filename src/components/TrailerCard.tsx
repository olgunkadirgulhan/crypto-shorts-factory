import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const FADE_FRAMES = 10;

type Props = {
  icon?: React.ReactNode;
  eyebrow: string;
  headline: string;
  tint: string;
  durationInFrames: number;
};

export const TrailerCard: React.FC<Props> = ({ icon, eyebrow, headline, tint, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationInFrames - FADE_FRAMES, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 20 });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 84px",
        opacity: Math.min(fadeIn, fadeOut),
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        }}
      >
        {icon && (
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: 999,
              backgroundColor: `${tint}1c`,
              border: `1px solid ${tint}59`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 36px",
            }}
          >
            {icon}
          </div>
        )}
        <div style={{ color: tint, fontSize: 28, fontWeight: 900, letterSpacing: 4 }}>{eyebrow}</div>
        <div
          style={{
            color: theme.ink,
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            marginTop: 20,
          }}
        >
          {headline}
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { theme } from "../theme";

export const Backdrop: React.FC<{ tint: string }> = ({ tint }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = interpolate(frame, [0, durationInFrames], [0, 60]);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 900px at 50% ${18 + drift * 0.15}%, ${tint}26, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${theme.hairline}1f 1px, transparent 1px), linear-gradient(90deg, ${theme.hairline}1f 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          backgroundPosition: `0px ${drift}px`,
          maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(to top, ${theme.bg} 0%, transparent 35%)`,
        }}
      />
    </AbsoluteFill>
  );
};

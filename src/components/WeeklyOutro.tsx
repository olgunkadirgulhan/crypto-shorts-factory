import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { BellIcon, HeartIcon } from "./icons";

const CtaPill: React.FC<{ icon: React.ReactNode; label: string; color: string; delay: number }> = ({
  icon,
  label,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 16 });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "20px 32px",
        borderRadius: 20,
        backgroundColor: `${color}1c`,
        border: `1px solid ${color}59`,
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
      }}
    >
      {icon}
      <span style={{ color: theme.ink, fontSize: 32, fontWeight: 900, letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
};

export const WeeklyOutro: React.FC<{ takeaway: string; tint: string }> = ({ takeaway, tint }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        opacity: interpolate(enter, [0, 1], [0, 1]),
        justifyContent: "center",
        alignItems: "center",
        padding: "0 140px",
      }}
    >
      <AbsoluteFill
        style={{ background: `radial-gradient(1100px 800px at 50% 45%, ${tint}30, transparent 70%)` }}
      />
      <div style={{ textAlign: "center", transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px)` }}>
        <div style={{ color: tint, fontSize: 26, fontWeight: 900, letterSpacing: 4 }}>THIS WEEK'S TAKEAWAY</div>
        <div
          style={{
            color: theme.ink,
            fontSize: 88,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: -2,
            marginTop: 22,
          }}
        >
          {takeaway}
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 44, justifyContent: "center" }}>
          <CtaPill icon={<BellIcon color={tint} size={34} />} label="FOLLOW" color={tint} delay={10} />
          <CtaPill icon={<HeartIcon color={theme.downText} size={30} />} label="LIKE" color={theme.downText} delay={16} />
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 28,
            borderTop: `1px solid ${theme.hairline}`,
            color: theme.inkSecondary,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Whale Market Pulse — daily Shorts and a weekly recap, always data, never advice.
        </div>
        <div style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700, marginTop: 14 }}>
          Market commentary from public price data. Not financial advice.
        </div>
      </div>
    </AbsoluteFill>
  );
};

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
        gap: 14,
        padding: "18px 28px",
        borderRadius: 18,
        backgroundColor: `${color}1c`,
        border: `1px solid ${color}59`,
        opacity: enter,
        transform: `scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
      }}
    >
      {icon}
      <span style={{ color: theme.ink, fontSize: 30, fontWeight: 900, letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
};

export const Outro: React.FC<{ takeaway: string; tint: string }> = ({ takeaway, tint }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 18 });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        opacity: interpolate(enter, [0, 1], [0, 1]),
        justifyContent: "center",
        padding: "0 78px",
      }}
    >
      <AbsoluteFill
        style={{ background: `radial-gradient(900px 700px at 50% 45%, ${tint}30, transparent 70%)` }}
      />
      <div style={{ transform: `translateY(${interpolate(enter, [0, 1], [26, 0])}px)` }}>
        <div style={{ color: tint, fontSize: 28, fontWeight: 900, letterSpacing: 4 }}>
          THE TAKEAWAY
        </div>
        <div
          style={{
            color: theme.ink,
            fontSize: 78,
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            marginTop: 22,
          }}
        >
          {takeaway}
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 40 }}>
          <CtaPill icon={<BellIcon color={tint} size={32} />} label="FOLLOW" color={tint} delay={10} />
          <CtaPill
            icon={<HeartIcon color={theme.downText} size={28} />}
            label="LIKE"
            color={theme.downText}
            delay={16}
          />
        </div>

        <div
          style={{
            marginTop: 42,
            paddingTop: 26,
            borderTop: `1px solid ${theme.hairline}`,
            color: theme.inkSecondary,
            fontSize: 27,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          Where the big money moved in crypto today. New story every day.
        </div>
        <div style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700, marginTop: 14 }}>
          Market commentary from public price data. Not financial advice.
        </div>
      </div>
    </AbsoluteFill>
  );
};

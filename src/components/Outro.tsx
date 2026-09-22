import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const BellIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3a5 5 0 0 0-5 5c0 4.5-2 6-2 6h14s-2-1.5-2-6a5 5 0 0 0-5-5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

const HeartIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 20.5s-7.2-4.6-10-9C0.3 8 1.8 4 5.7 4c2.1 0 3.7 1.3 4.7 3 1-1.7 2.6-3 4.7-3 3.9 0 5.4 4 3.7 7.5-2.8 4.4-10 9-10 9Z" />
  </svg>
);

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
          Daily crypto chart breakdowns — new video every day.
        </div>
        <div style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700, marginTop: 14 }}>
          Market commentary from public price data. Not financial advice.
        </div>
      </div>
    </AbsoluteFill>
  );
};

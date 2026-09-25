import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { SLOT_LABEL, type CoinInfo, type ShortProps } from "../types";

type Props = {
  slot: ShortProps["slot"];
  coin: CoinInfo;
  logoFile: string | null;
  rank: number | null;
  index: number;
  total: number;
};

export const Header: React.FC<Props> = ({ slot, coin, logoFile, rank, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
  const y = interpolate(enter, [0, 1], [-40, 0]);

  return (
    <div style={{ padding: "0 56px", opacity: enter, transform: `translateY(${y}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 22px",
            borderRadius: 999,
            backgroundColor: theme.surfaceRaised,
            border: `1px solid ${theme.hairline}`,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: theme.downText,
            }}
          />
          <span
            style={{
              color: theme.inkSecondary,
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 2.4,
            }}
          >
            {SLOT_LABEL[slot]}
          </span>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderRadius: 999,
            backgroundColor: theme.surfaceRaised,
            border: `1px solid ${theme.hairline}`,
            color: theme.amberText,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 1,
          }}
        >
          {total > 1 ? `${index} / ${total}` : "LAST 24H"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 26, marginTop: 30 }}>
        {logoFile ? (
          <Img
            src={staticFile(logoFile)}
            style={{ width: 104, height: 104, borderRadius: 999 }}
          />
        ) : (
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 999,
              backgroundColor: theme.surfaceRaised,
              border: `1px solid ${theme.hairline}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.ink,
              fontSize: 40,
              fontWeight: 900,
            }}
          >
            {coin.symbol.slice(0, 3)}
          </div>
        )}
        <div>
          <div style={{ color: theme.ink, fontSize: 60, fontWeight: 900, lineHeight: 1.05 }}>
            {coin.name}
          </div>
          <div
            style={{
              color: theme.inkMuted,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 1.6,
              marginTop: 6,
            }}
          >
            {coin.symbol}
            {rank ? ` · RANK #${rank}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};

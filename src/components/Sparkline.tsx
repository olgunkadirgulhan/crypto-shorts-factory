import React from "react";
import { dirColor, numeric, theme } from "../theme";
import type { Candle } from "../types";

type Props = {
  candles: Candle[];
  width: number;
  height: number;
  support: number;
  resistance: number;
  supportText: string;
  resistanceText: string;
  up: boolean;
  progress: number;
};

const PAD_X = 12;
const PAD_Y = 28;

export const Sparkline: React.FC<Props> = ({
  candles,
  width,
  height,
  support,
  resistance,
  supportText,
  resistanceText,
  up,
  progress,
}) => {
  const innerW = width - PAD_X * 2;
  const innerH = height - PAD_Y * 2;
  const closes = candles.map((c) => c.c);
  const min = Math.min(...closes, support);
  const max = Math.max(...closes, resistance);
  const headroom = (max - min) * 0.1 || max * 0.01 || 1;
  const lo = min - headroom;
  const hi = max + headroom;

  const x = (i: number) => PAD_X + (i / (candles.length - 1)) * innerW;
  const y = (v: number) => PAD_Y + ((hi - v) / (hi - lo)) * innerH;

  const linePath = closes.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(closes.length - 1).toFixed(1)},${(PAD_Y + innerH).toFixed(1)} L${PAD_X},${(PAD_Y + innerH).toFixed(1)} Z`;
  const color = dirColor(up);
  const pathLen = width * 2.2;

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sparkFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      <line x1={PAD_X} x2={width - PAD_X} y1={y(resistance)} y2={y(resistance)} stroke={theme.hairline} strokeWidth={1.5} strokeDasharray="8 7" opacity={progress} />
      <line x1={PAD_X} x2={width - PAD_X} y1={y(support)} y2={y(support)} stroke={theme.hairline} strokeWidth={1.5} strokeDasharray="8 7" opacity={progress} />
      <text x={width - PAD_X} y={y(resistance) - 10} textAnchor="end" fill={theme.inkMuted} fontSize={18} fontWeight={700} fontFamily={theme.fontFamily} opacity={progress}>
        4H HIGH ${resistanceText}
      </text>
      <text x={width - PAD_X} y={y(support) + 24} textAnchor="end" fill={theme.inkMuted} fontSize={18} fontWeight={700} fontFamily={theme.fontFamily} opacity={progress}>
        4H LOW ${supportText}
      </text>

      <path d={areaPath} fill="url(#sparkFade)" opacity={progress} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        strokeDashoffset={pathLen * (1 - progress)}
      />
      {progress > 0.98 && (
        <circle cx={x(closes.length - 1)} cy={y(closes[closes.length - 1])} r={7} fill={color} style={numeric} />
      )}
    </svg>
  );
};

import React from "react";
import { interpolate } from "remotion";
import { dirMark, numeric, theme } from "../theme";
import type { Candle } from "../types";

type Props = {
  candles: Candle[];
  width: number;
  height: number;
  price: number;
  support: number;
  resistance: number;
  supportText: string;
  resistanceText: string;
  priceText: string;
  progress: number;
};

const PAD = { top: 44, right: 178, bottom: 34, left: 20 };

export const CandleChart: React.FC<Props> = ({
  candles,
  width,
  height,
  price,
  support,
  resistance,
  supportText,
  resistanceText,
  priceText,
  progress,
}) => {
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const lows = candles.map((c) => c.l);
  const highs = candles.map((c) => c.h);
  const rawMin = Math.min(...lows, support, price);
  const rawMax = Math.max(...highs, resistance, price);
  const headroom = (rawMax - rawMin) * 0.08 || rawMax * 0.01 || 1;
  const min = rawMin - headroom;
  const max = rawMax + headroom;

  const y = (p: number) => PAD.top + ((max - p) / (max - min)) * innerH;
  const slotW = innerW / candles.length;
  const bodyW = Math.max(3, Math.min(slotW * 0.6, 18));
  const cx = (i: number) => PAD.left + slotW * (i + 0.5);

  const revealed = progress * candles.length;
  const lineProgress = interpolate(progress, [0, 0.25], [0, 1], {
    extrapolateRight: "clamp",
  });

  const closePath = candles
    .map((c, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${y(c.c).toFixed(1)}`)
    .join(" ");

  const levels = [
    { y: y(resistance), label: "4H HIGH", value: resistanceText, color: theme.inkSecondary, solid: false },
    { y: y(price), label: "LAST", value: priceText, color: theme.amberText, solid: true },
    { y: y(support), label: "4H LOW", value: supportText, color: theme.inkSecondary, solid: false },
  ];
  const labelYs = decollide(
    levels.map((l) => l.y),
    62,
    PAD.top + 16,
    PAD.top + innerH - 8,
  );

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {/* Recessive grid - present for reference, never competing with the marks. */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={PAD.top + innerH * f}
          y2={PAD.top + innerH * f}
          stroke={theme.hairline}
          strokeWidth={1}
        />
      ))}

      <path
        d={closePath}
        fill="none"
        stroke={theme.blueMark}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.3}
        strokeDasharray={innerW * 2}
        strokeDashoffset={innerW * 2 * (1 - progress)}
      />

      {candles.map((c, i) => {
        const shown = revealed - i;
        if (shown <= 0) return null;
        const up = c.c >= c.o;
        const color = dirMark(up);
        const bodyTop = y(Math.max(c.o, c.c));
        const bodyH = Math.max(2, Math.abs(y(c.o) - y(c.c)));
        return (
          <g key={c.t} opacity={Math.min(1, shown)}>
            <line
              x1={cx(i)}
              x2={cx(i)}
              y1={y(c.h)}
              y2={y(c.l)}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <rect
              x={cx(i) - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              rx={Math.min(3, bodyW / 3)}
              fill={color}
            />
          </g>
        );
      })}

      {levels.map((level, i) => (
        <LevelLine
          key={level.label}
          lineY={level.y}
          labelY={labelYs[i]}
          width={innerW}
          label={level.label}
          value={level.value}
          color={level.color}
          progress={lineProgress}
          solid={level.solid}
        />
      ))}
    </svg>
  );
};

// The three levels converge whenever price sits near the 4h high or low, which
// would stack their labels on top of each other. Lines stay at their true price;
// only the label blocks are pushed apart.
function decollide(ys: number[], minGap: number, minY: number, maxY: number): number[] {
  const order = ys.map((y, i) => ({ y, i, adj: y })).sort((a, b) => a.y - b.y);

  let prev = -Infinity;
  for (const o of order) {
    o.adj = Math.max(o.y, prev + minGap, minY);
    prev = o.adj;
  }

  let overflow = order[order.length - 1].adj - maxY;
  for (let k = order.length - 1; k >= 0 && overflow > 0; k--) {
    order[k].adj -= overflow;
    overflow = k > 0 ? minGap - (order[k].adj - order[k - 1].adj) : 0;
  }

  const out = new Array<number>(ys.length);
  for (const o of order) out[o.i] = o.adj;
  return out;
}

const LevelLine: React.FC<{
  lineY: number;
  labelY: number;
  width: number;
  label: string;
  value: string;
  color: string;
  progress: number;
  solid?: boolean;
}> = ({ lineY, labelY, width, label, value, color, progress, solid }) => {
  const lineEnd = PAD.left + width * progress;
  const offset = Math.abs(labelY - lineY) > 5;
  return (
    <g opacity={progress}>
      <line
        x1={PAD.left}
        x2={lineEnd}
        y1={lineY}
        y2={lineY}
        stroke={color}
        strokeWidth={solid ? 2 : 1.5}
        strokeDasharray={solid ? undefined : "10 8"}
        opacity={solid ? 0.95 : 0.55}
      />
      {offset && (
        <polyline
          points={`${PAD.left + width},${lineY} ${PAD.left + width + 8},${labelY} ${PAD.left + width + 14},${labelY}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.45}
        />
      )}
      <text
        x={PAD.left + width + 16}
        y={labelY - 7}
        fill={theme.inkMuted}
        fontSize={19}
        fontWeight={700}
        letterSpacing={1.2}
        fontFamily={theme.fontFamily}
      >
        {label}
      </text>
      <text
        x={PAD.left + width + 16}
        y={labelY + 23}
        fill={color}
        fontSize={31}
        fontWeight={800}
        fontFamily={theme.fontFamily}
        style={numeric}
      >
        ${value}
      </text>
    </g>
  );
};

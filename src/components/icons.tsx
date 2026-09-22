import React from "react";

// Hand-drawn, stroke-based icons - never emoji. Headless Ubuntu render runners
// can lack a color emoji font and show empty boxes instead of the glyph.
type IconProps = { color: string; size: number };

export const ShieldIcon: React.FC<IconProps> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 3.5 19 6v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-2.5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path d="M9 12.2 11.2 14.4 15.5 10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="9" rx="2.4" stroke={color} strokeWidth={2} />
    <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <circle cx="12" cy="15.3" r="1.4" fill={color} />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="10.5" cy="10.5" r="6.5" stroke={color} strokeWidth={2} />
    <path d="M19.5 19.5 15 15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export const BarsIcon: React.FC<IconProps> = ({ color, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3.5" y="12" width="4" height="8.5" rx="1" fill={color} />
    <rect x="10" y="6.5" width="4" height="14" rx="1" fill={color} />
    <rect x="16.5" y="9.5" width="4" height="11" rx="1" fill={color} />
  </svg>
);

import { loadFont } from "@remotion/google-fonts/Inter";

export const { fontFamily } = loadFont();

// Mark colors are the validated dark-surface categorical palette
// (scripts/validate_palette.js, --mode dark: all six checks pass).
// Green/red sits in the 6-8 CVD floor band, which is only legal with secondary
// encoding - every up/down mark is therefore paired with a triangle glyph and a
// signed number, so direction is never carried by color alone.
export const theme = {
  fontFamily,
  bg: "#080B10",
  surface: "#111823",
  surfaceRaised: "#18212F",
  hairline: "#22303F",
  ink: "#F2F6FB",
  inkSecondary: "#A7B4C6",
  inkMuted: "#6C7B8F",
  upMark: "#00A88A",
  downMark: "#E03A52",
  upText: "#17C79E",
  downText: "#FF6076",
  amberMark: "#C08A08",
  amberText: "#E8AE1A",
  blueMark: "#4478D0",
  blueText: "#6E9CEE",
} as const;

export const dirColor = (positive: boolean) => (positive ? theme.upText : theme.downText);
export const dirMark = (positive: boolean) => (positive ? theme.upMark : theme.downMark);
export const dirGlyph = (positive: boolean) => (positive ? "▲" : "▼");

export const numeric = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
} as const;

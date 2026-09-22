import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Captions } from "../components/Captions";
import { CoinPanel } from "../components/CoinPanel";
import { HookOverlay } from "../components/HookOverlay";
import { Outro } from "../components/Outro";
import { SpotlightPanel } from "../components/SpotlightPanel";
import { theme } from "../theme";
import type { ShortProps } from "../types";

const HOOK_SEC = 2.6;

const TINT: Record<"bullish" | "bearish" | "neutral", string> = {
  bullish: theme.upText,
  bearish: theme.downText,
  neutral: theme.blueText,
};

export const CryptoShort: React.FC<ShortProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const hookFrames = Math.round(HOOK_SEC * fps);

  const lastSegment = props.segments[props.segments.length - 1];
  const outroStartFrame = Math.round(lastSegment.endSec * fps);
  const outroFrames = Math.max(1, durationInFrames - outroStartFrame);

  const t = frame / fps;
  const activeSegment = props.segments.find((s) => t >= s.startSec && t < s.endSec);
  const tint = TINT[(activeSegment ?? lastSegment)?.sentiment ?? "neutral"];

  return (
    <AbsoluteFill style={{ fontFamily: theme.fontFamily, backgroundColor: theme.bg }}>
      <Backdrop tint={tint} />

      {props.audioFile && <Audio src={staticFile(props.audioFile)} />}

      {props.segments.map((segment, i) => {
        const from = Math.round(segment.startSec * fps);
        const to = Math.round(segment.endSec * fps);
        const localDuration = Math.max(1, to - from);
        const PanelComponent = props.style === "spotlight" ? SpotlightPanel : CoinPanel;
        return (
          <Sequence key={segment.coin.id} from={from} durationInFrames={localDuration}>
            <PanelComponent
              slot={props.slot}
              segment={segment}
              index={i + 1}
              total={props.segments.length}
              durationInFrames={localDuration}
            />
          </Sequence>
        );
      })}

      {/* Captions sit outside the Sequences so their timings stay absolute,
          matching the offsets ffmpeg used to place each voiceover line.
          The scrim keeps a long caption readable over the tiles above. */}
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            paddingTop: 130,
            paddingBottom: 150,
            background: `linear-gradient(to top, ${theme.bg} 62%, ${theme.bg}D9 82%, transparent)`,
          }}
        >
          <Captions captions={props.captions} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 64,
        }}
      >
        <div style={{ color: theme.inkMuted, fontSize: 22, fontWeight: 700, letterSpacing: 1.2 }}>
          DATA: COINGECKO · NOT FINANCIAL ADVICE
        </div>
      </AbsoluteFill>

      <Sequence durationInFrames={hookFrames}>
        <HookOverlay
          slot={props.slot}
          hook={props.hook}
          segments={props.segments.map((s) => ({ symbol: s.coin.symbol, changePct: s.metrics.change24hPct }))}
          tint={tint}
          durationInFrames={hookFrames}
        />
      </Sequence>

      <Sequence from={outroStartFrame} durationInFrames={outroFrames}>
        <Outro takeaway={props.takeaway} tint={tint} />
      </Sequence>
    </AbsoluteFill>
  );
};

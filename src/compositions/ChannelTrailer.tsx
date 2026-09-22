import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { BrandIntro } from "../components/BrandIntro";
import { Captions } from "../components/Captions";
import { Outro } from "../components/Outro";
import { TrailerCard } from "../components/TrailerCard";
import { BarsIcon, LockIcon, SearchIcon, ShieldIcon } from "../components/icons";
import { theme } from "../theme";
import type { TrailerProps } from "../types";

const TINT = theme.blueText;
const ICON_SIZE = 56;

const ICONS: Record<NonNullable<TrailerProps["cards"][number]["icon"]>, React.ReactNode> = {
  shield: <ShieldIcon color={TINT} size={ICON_SIZE} />,
  lock: <LockIcon color={TINT} size={ICON_SIZE} />,
  search: <SearchIcon color={TINT} size={ICON_SIZE} />,
  bars: <BarsIcon color={TINT} size={ICON_SIZE} />,
};

export const ChannelTrailer: React.FC<TrailerProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();

  // One card per caption line EXCEPT the last (the CTA line, which plays under
  // the Outro instead of its own card) - so props.cards.length === captions.length - 1.
  // Boundaries computed once and shared between neighbors, same as CryptoShort,
  // so cards cut with no gap or overlap.
  const boundaries: number[] = [0];
  for (let i = 1; i < props.captions.length; i++) {
    boundaries.push(Math.max(boundaries[i - 1] + 1, round2(props.captions[i].start - 0.3)));
  }
  const outroStartFrame = Math.round(boundaries[boundaries.length - 1] * fps);
  const outroFrames = Math.max(1, durationInFrames - outroStartFrame);

  return (
    <AbsoluteFill style={{ fontFamily: theme.fontFamily, backgroundColor: theme.bg }}>
      <Backdrop tint={TINT} />
      {props.audioFile && <Audio src={staticFile(props.audioFile)} />}

      {props.cards.map((card, i) => {
        const from = Math.round(boundaries[i] * fps);
        const to = Math.round(boundaries[i + 1] * fps);
        const durationInFramesLocal = Math.max(1, to - from);
        return (
          <Sequence key={i} from={from} durationInFrames={durationInFramesLocal}>
            {i === 0 ? (
              <BrandIntro tint={TINT} durationInFrames={durationInFramesLocal} />
            ) : (
              <TrailerCard
                icon={card.icon ? ICONS[card.icon] : undefined}
                eyebrow={card.eyebrow}
                headline={card.headline}
                tint={TINT}
                durationInFrames={durationInFramesLocal}
              />
            )}
          </Sequence>
        );
      })}

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

      <Sequence from={outroStartFrame} durationInFrames={outroFrames}>
        <Outro takeaway={props.takeaway} tint={TINT} />
      </Sequence>
    </AbsoluteFill>
  );
};

const round2 = (n: number) => Number(n.toFixed(2));

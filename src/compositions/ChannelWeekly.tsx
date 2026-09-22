import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { Captions } from "../components/Captions";
import { WeeklyCoinPanel } from "../components/WeeklyCoinPanel";
import { WeeklyIntro } from "../components/WeeklyIntro";
import { WeeklyOutro } from "../components/WeeklyOutro";
import { theme } from "../theme";
import type { WeeklyVideoProps } from "../types";

const TINT = theme.blueText;
const OVERVIEW_LINES = 4;
const LINES_PER_COIN = 4;

const round2 = (n: number) => Number(n.toFixed(2));

export const ChannelWeekly: React.FC<WeeklyVideoProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();

  // captions layout: [0,3) overview, [3+3i, 3+3i+3) per coin i, last = CTA (Outro only).
  const boundaries: number[] = [0];
  for (let i = 1; i < props.captions.length; i++) {
    boundaries.push(Math.max(boundaries[i - 1] + 1, round2(props.captions[i].start - 0.3)));
  }
  const outroStartFrame = Math.round(boundaries[boundaries.length - 1] * fps);
  const outroFrames = Math.max(1, durationInFrames - outroStartFrame);

  const introFrom = Math.round(boundaries[0] * fps);
  const introTo = Math.round(boundaries[OVERVIEW_LINES] * fps);

  return (
    <AbsoluteFill style={{ fontFamily: theme.fontFamily, backgroundColor: theme.bg }}>
      <Backdrop tint={TINT} />
      {props.audioFile && <Audio src={staticFile(props.audioFile)} />}

      <Sequence from={introFrom} durationInFrames={Math.max(1, introTo - introFrom)}>
        <WeeklyIntro hook={props.hook} global={props.global} tint={TINT} durationInFrames={Math.max(1, introTo - introFrom)} />
      </Sequence>

      {props.segments.map((segment, i) => {
        const startIdx = OVERVIEW_LINES + i * LINES_PER_COIN;
        const from = Math.round(boundaries[startIdx] * fps);
        const to = Math.round(boundaries[startIdx + LINES_PER_COIN] * fps);
        const localDuration = Math.max(1, to - from);
        return (
          <Sequence key={segment.coin.id} from={from} durationInFrames={localDuration}>
            <WeeklyCoinPanel segment={segment} index={i + 1} total={props.segments.length} durationInFrames={localDuration} />
          </Sequence>
        );
      })}

      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div
          style={{
            paddingTop: 90,
            paddingBottom: 70,
            background: `linear-gradient(to top, ${theme.bg} 62%, ${theme.bg}D9 82%, transparent)`,
          }}
        >
          <Captions captions={props.captions} hideProgress />
        </div>
      </AbsoluteFill>

      <Sequence from={outroStartFrame} durationInFrames={outroFrames}>
        <WeeklyOutro takeaway={props.takeaway} tint={TINT} />
      </Sequence>
    </AbsoluteFill>
  );
};

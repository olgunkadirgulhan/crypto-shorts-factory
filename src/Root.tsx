import React from "react";
import { Composition } from "remotion";
import { ChannelTrailer } from "./compositions/ChannelTrailer";
import { CryptoShort } from "./compositions/CryptoShort";
import { sampleProps } from "./sample";
import { trailerSampleProps } from "./trailerSample";
import type { ShortProps, TrailerProps } from "./types";

const FPS = 30;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CryptoShort"
      component={CryptoShort}
      durationInFrames={Math.round(sampleProps.durationSec * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={sampleProps}
      calculateMetadata={({ props }: { props: ShortProps }) => ({
        durationInFrames: Math.max(FPS, Math.round(props.durationSec * FPS)),
        fps: FPS,
      })}
    />
    <Composition
      id="ChannelTrailer"
      component={ChannelTrailer}
      durationInFrames={Math.round(trailerSampleProps.durationSec * FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={trailerSampleProps}
      calculateMetadata={({ props }: { props: TrailerProps }) => ({
        durationInFrames: Math.max(FPS, Math.round(props.durationSec * FPS)),
        fps: FPS,
      })}
    />
  </>
);

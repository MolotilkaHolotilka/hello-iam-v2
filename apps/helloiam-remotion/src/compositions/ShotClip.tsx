import React from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont} from '@remotion/google-fonts/InstrumentSans';
import {loadFont as loadInstrumentSerif} from '@remotion/google-fonts/InstrumentSerif';
import {
  editorialDriftScale,
  editorialTextYOffset,
  fadeAlpha,
  resolveFadeFrames,
} from '../motion/motionPrimitives';
import type {ShotDefinition} from './post001';

const sans = loadFont('normal', {
  weights: ['700', '400'],
  subsets: ['latin'],
});

const serif = loadInstrumentSerif('normal', {
  weights: ['400'],
  subsets: ['latin'],
});

export type ShotClipProps = {
  shot: ShotDefinition;
  sequenceStartFrame: number;
};

export const ShotClip: React.FC<ShotClipProps> = ({
  shot,
  sequenceStartFrame,
}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const rel = frame - sequenceStartFrame;

  const enterFade = resolveFadeFrames(shot.enter);

  const fadeInFrames =
    shot.enter === 'fade'
      ? 22
      : shot.enter === 'dissolve'
        ? enterFade.fadeIn
        : 2;
  const fadeOutFrames =
    shot.exit === 'fade'
      ? 26
      : shot.exit === 'dissolve'
        ? resolveFadeFrames(shot.exit).fadeOut
        : 0;

  const imgOpacity = fadeAlpha(
    rel,
    fadeInFrames,
    fadeOutFrames,
    shot.durationFrames,
  );
  const driftScale = editorialDriftScale(rel, shot.durationFrames);

  const isHero = shot.textVariant === 'hero';

  const textOpacity = fadeAlpha(
    rel,
    Math.min(18, fadeInFrames + 4),
    fadeOutFrames > 0 ? fadeOutFrames : 0,
    shot.durationFrames,
  );

  const yOffset = editorialTextYOffset(rel);

  const heroStyle: React.CSSProperties = {
    fontFamily: sans.fontFamily,
    fontWeight: 700,
    fontSize: 108,
    lineHeight: 1.05,
    color: '#d61e23',
    textAlign: 'center',
    maxWidth: 920,
    padding: '0 56px',
    textShadow: '0 12px 48px rgba(31, 20, 10, 0.12)',
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: serif.fontFamily,
    fontWeight: 400,
    fontSize: 46,
    lineHeight: 1.15,
    color: '#1f140a',
    textAlign: 'center',
    maxWidth: 920,
    padding: '0 56px',
    textShadow: '0 10px 36px rgba(31, 20, 10, 0.1)',
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#fff7e8'}}>
      <AbsoluteFill style={{opacity: imgOpacity}}>
        <Img
          src={staticFile(`frames/${shot.asset}`)}
          style={{
            width,
            height,
            objectFit: 'cover',
            transform: `scale(${driftScale})`,
            transformOrigin: '50% 45%',
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: height * 0.22,
          opacity: textOpacity,
          transform: `translateY(${yOffset}px)`,
        }}
      >
        <div style={isHero ? heroStyle : bodyStyle}>{shot.text}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

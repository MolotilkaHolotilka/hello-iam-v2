import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import {POST001_SHOTS, POST001_TOTAL_FRAMES} from './post001';
import {ShotClip} from './ShotClip';

export const IAmLaunch: React.FC = () => {
  let cursor = 0;

  return (
    <AbsoluteFill style={{backgroundColor: '#fff7e8'}}>
      {POST001_SHOTS.map((shot) => {
        const from = cursor;
        cursor += shot.durationFrames;

        return (
          <Sequence
            key={shot.asset}
            from={from}
            durationInFrames={shot.durationFrames}
            name={shot.asset}
          >
            <ShotClip shot={shot} sequenceStartFrame={from} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const I_AM_LAUNCH_DURATION = POST001_TOTAL_FRAMES;

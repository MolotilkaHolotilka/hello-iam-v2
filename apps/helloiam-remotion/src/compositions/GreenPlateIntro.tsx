import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';
import {
  fontFamily as instrumentSerif,
  loadFont as loadInstrumentSerif,
} from '@remotion/google-fonts/InstrumentSerif';

loadInstrumentSans();
loadInstrumentSerif();

const CARD_FRAMES = 90;
export const GREEN_PLATE_INTRO_DURATION = CARD_FRAMES * 3;

const LAVASH_PHOTO = staticFile('generated/lavash.png');
const GREENS_EMOJI = staticFile('generated/emoji-greens.png');

const cardBase: React.CSSProperties = {
  position: 'relative',
  width: 1080,
  height: 1350,
  overflow: 'hidden',
};

function useCardTransition(localFrame: number) {
  const enter = interpolate(localFrame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exit = interpolate(localFrame, [CARD_FRAMES - 14, CARD_FRAMES], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return Math.min(enter, exit);
}

function motion(localFrame: number, delay = 0, y = 36): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [y, 0])}px)`,
  };
}

function slideX(localFrame: number, delay = 0, x = 40): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: progress,
    transform: `translateX(${interpolate(progress, [0, 1], [x, 0])}px)`,
  };
}

function fadeScale(localFrame: number, delay = 0, from = 0.92): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: progress,
    transform: `scale(${interpolate(progress, [0, 1], [from, 1])})`,
  };
}

function Post70() {
  const frame = useCurrentFrame();
  const cardOpacity = useCardTransition(frame);

  const bgScale = interpolate(frame, [0, CARD_FRAMES], [1.05, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{...cardBase, background: '#d61e23', opacity: cardOpacity}}>
      <div
        style={{
          position: 'absolute',
          left: -95,
          top: 242,
          width: 1698,
          height: 1698,
          ...motion(frame, 4, 60),
        }}
      >
        <Img
          src={GREENS_EMOJI}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            transform: `scale(${bgScale})`,
            transformOrigin: 'center',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 164,
          lineHeight: 0.951,
          color: '#fff',
          ...slideX(frame, 0, -50),
        }}
      >
        <div>Hello,</div>
        <div>I Am</div>
        <div style={{color: '#ffce1f'}}>GREEN</div>
        <div style={{color: '#ffce1f'}}>PLATE</div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 1285,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 26,
          color: '#000',
          letterSpacing: 1,
          ...motion(frame, 18, 14),
        }}
      >
        AM FOOD
      </div>
    </div>
  );
}

function Post71() {
  const frame = useCurrentFrame();
  const cardOpacity = useCardTransition(frame);

  const lavashFloat = interpolate(frame, [0, CARD_FRAMES], [-8, 8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lavashTilt = interpolate(frame, [0, CARD_FRAMES], [-1.2, 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{...cardBase, background: '#d9dde0', opacity: cardOpacity}}>
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 44,
          lineHeight: 1,
          color: '#0f0f10',
          ...slideX(frame, 0, -30),
        }}
      >
        Hello, I Am<br />GREEN PLATE
      </div>

      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 235,
          width: 1024,
          height: 645,
          overflow: 'hidden',
          ...fadeScale(frame, 4, 0.94),
        }}
      >
        <Img
          src={LAVASH_PHOTO}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: `translateY(${lavashFloat}px) rotate(${lavashTilt}deg)`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 928,
          width: 830,
          fontFamily: instrumentSerif,
          fontSize: 64,
          lineHeight: 0.875,
          color: '#d61e23',
          ...motion(frame, 14, 24),
        }}
      >
        Start with bread. Lavash is foundation, gesture, and memory.
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 1285,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 26,
          color: '#000',
          letterSpacing: 1,
          ...motion(frame, 22, 14),
        }}
      >
        AM FOOD
      </div>
    </div>
  );
}

function Post75() {
  const frame = useCurrentFrame();
  const cardOpacity = useCardTransition(frame);

  const emojiTilt = interpolate(frame, [0, 24, CARD_FRAMES], [-22, 0, 6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{...cardBase, background: '#d9dde0', opacity: cardOpacity}}>
      <div
        style={{
          position: 'absolute',
          top: 588,
          left: 0,
          width: 1080,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 96,
          lineHeight: 0.958,
          color: '#420000',
          ...fadeScale(frame, 0, 0.94),
        }}
      >
        <span style={slideX(frame, 6, -60)}>helloiam</span>
        <Img
          src={GREENS_EMOJI}
          style={{
            width: 180,
            height: 180,
            objectFit: 'contain',
            transform: `rotate(${emojiTilt}deg)`,
            ...fadeScale(frame, 10, 0.6),
          }}
        />
        <span style={slideX(frame, 6, 60)}>am</span>
      </div>
    </div>
  );
}

const CardStage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      background: '#f0f0f0',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </AbsoluteFill>
);

export const GreenPlateIntro: React.FC = () => {
  return (
    <AbsoluteFill style={{background: '#f0f0f0'}}>
      <Sequence durationInFrames={CARD_FRAMES} name="Post70">
        <CardStage>
          <Post70 />
        </CardStage>
      </Sequence>
      <Sequence
        from={CARD_FRAMES}
        durationInFrames={CARD_FRAMES}
        name="Post71"
      >
        <CardStage>
          <Post71 />
        </CardStage>
      </Sequence>
      <Sequence
        from={CARD_FRAMES * 2}
        durationInFrames={CARD_FRAMES}
        name="Post75"
      >
        <CardStage>
          <Post75 />
        </CardStage>
      </Sequence>
    </AbsoluteFill>
  );
};

export const GREEN_PLATE_CARD_DURATION = CARD_FRAMES;

export const GreenPlateCard70: React.FC = () => (
  <CardStage>
    <Post70 />
  </CardStage>
);

export const GreenPlateCard71: React.FC = () => (
  <CardStage>
    <Post71 />
  </CardStage>
);

export const GreenPlateCard75: React.FC = () => (
  <CardStage>
    <Post75 />
  </CardStage>
);

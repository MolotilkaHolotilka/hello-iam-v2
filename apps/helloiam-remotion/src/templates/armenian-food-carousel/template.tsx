import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';
import {
  fontFamily as instrumentSerif,
  loadFont as loadInstrumentSerif,
} from '@remotion/google-fonts/InstrumentSerif';
import type {TemplateRenderProps} from '../types';

loadInstrumentSans();
loadInstrumentSerif();

type CardSlot = NonNullable<TemplateRenderProps['card1']>;

const cardBase: React.CSSProperties = {
  border: '0.5px solid rgba(0,0,0,0.1)',
  flexShrink: 0,
  height: 600,
  overflow: 'hidden',
  position: 'relative',
  width: 600,
};

const checkerboard = (light = '#ccc', dark = '#fff') =>
  `repeating-conic-gradient(${light} 0% 25%, ${dark} 0% 50%) 0 0 / 10px 10px`;

function mediaSource(image?: string) {
  if (!image) return null;
  if (/^(https?:|data:|file:)/.test(image)) return image;
  if (image.startsWith('/')) return image;
  return staticFile(image.replace(/^public[\\/]/, '').replace(/\\/g, '/'));
}

function asText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function motion(localFrame: number, delay = 0, y = 18): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    opacity: progress,
    transform: `translateY(${interpolate(progress, [0, 1], [y, 0])}px)`,
  };
}

function fadeScale(localFrame: number, delay = 0, from = 0.94): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    opacity: progress,
    transform: `scale(${interpolate(progress, [0, 1], [from, 1])})`,
  };
}

function slideX(localFrame: number, delay = 0, x = 18): React.CSSProperties {
  const progress = interpolate(localFrame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    opacity: progress,
    transform: `translateX(${interpolate(progress, [0, 1], [x, 0])}px)`,
  };
}

const ImageFill: React.FC<{
  image?: string;
  opacity?: number;
  localFrame?: number;
  scaleFrom?: number;
  driftX?: number;
  driftY?: number;
}> = ({image, opacity = 1, localFrame = 20, scaleFrom = 1.04, driftX = 0, driftY = 0}) => {
  const source = mediaSource(image);
  const scale = interpolate(localFrame, [0, 30], [scaleFrom, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = interpolate(localFrame, [0, 30], [driftX, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(localFrame, [0, 30], [driftY, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (!source) {
    return <div style={{background: '#c0c4c7', inset: 0, position: 'absolute'}} />;
  }

  return (
    <Img
      src={source}
      style={{
        height: '100%',
        inset: 0,
        objectFit: 'cover',
        opacity,
        position: 'absolute',
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        width: '100%',
      }}
    />
  );
};

const Thumb: React.FC<{
  image?: string;
  dark?: boolean;
  left?: number;
  top?: number;
  localFrame?: number;
}> = ({image, dark = false, left = 33, top = 473, localFrame = 20}) => {
  const source = mediaSource(image);

  return (
    <div
      style={{
        background: source ? 'transparent' : dark ? checkerboard('#555', '#333') : checkerboard(),
        height: 90,
        left,
        overflow: 'hidden',
        position: 'absolute',
        top,
        width: 90,
        ...motion(localFrame, 8, 10),
      }}
    >
      {source ? (
        <Img
          src={source}
          style={{
            height: '100%',
            objectFit: 'cover',
            width: '100%',
          }}
        />
      ) : null}
    </div>
  );
};

const Counter: React.FC<{
  value?: string;
  color?: string;
  localFrame?: number;
}> = ({value, color = '#1e1e1e', localFrame = 20}) => (
  <div
    style={{
      bottom: 83,
      color,
      fontFamily: instrumentSans,
      fontSize: 12,
      position: 'absolute',
      right: 61,
      ...motion(localFrame, 14, 8),
    }}
  >
    {value}
  </div>
);

function Card1({card, localFrame}: {card: CardSlot; localFrame: number}) {
  return (
    <div style={{...cardBase, background: '#d9dde0'}}>
      <div
        style={{
          color: '#d61e23',
          fontFamily: instrumentSerif,
          fontSize: 48,
          fontStyle: 'italic',
          fontWeight: 'normal',
          left: 43,
          lineHeight: 0.958,
          position: 'absolute',
          top: 51,
          whiteSpace: 'pre-line',
          ...slideX(localFrame, 0, -24),
        }}
      >
        {asText(card.title, 'Fact\nnumber\nOne')}
      </div>
      <div
        style={{
          color: '#1e1e1e',
          fontFamily: instrumentSans,
          fontSize: 16,
          fontWeight: 'normal',
          left: 43,
          lineHeight: 1.4,
          position: 'absolute',
          top: 228,
          width: 386,
          ...motion(localFrame, 5, 22),
        }}
      >
        {asText(card.text)}
      </div>
      <Thumb image={card.image} localFrame={localFrame + 4} />
      <Counter localFrame={localFrame} value={asText(card.counter, '1/6')} />
    </div>
  );
}

function Card2({card, localFrame}: {card: CardSlot; localFrame: number}) {
  return (
    <div style={{...cardBase, background: '#000'}}>
      <ImageFill
        driftX={18}
        image={card.backgroundImage || card.image}
        localFrame={localFrame}
        opacity={0.5}
        scaleFrom={1.08}
      />
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.26)',
          inset: 0,
          position: 'absolute',
        }}
      />
      <div
        style={{
          color: '#fff',
          fontFamily: instrumentSans,
          fontSize: 48,
          fontWeight: 700,
          left: 43,
          lineHeight: 0.958,
          position: 'absolute',
          top: 51,
          whiteSpace: 'pre-line',
          ...slideX(localFrame, 0, -32),
        }}
      >
        {asText(card.title, 'Hello, I Am\nArmenian\nLAVASH')}
      </div>
      <div
        style={{
          color: '#fff',
          fontFamily: instrumentSerif,
          fontSize: 32,
          fontStyle: 'italic',
          left: 43,
          lineHeight: 0.6875,
          position: 'absolute',
          top: 228,
          whiteSpace: 'pre-line',
          width: 230,
          ...motion(localFrame, 7, 28),
        }}
      >
        {asText(card.subtitle, 'Thin bread baked\nin stone oven')}
      </div>
      <Thumb dark image={card.image} left={43} localFrame={localFrame + 6} />
    </div>
  );
}

function Card3({card, localFrame}: {card: CardSlot; localFrame: number}) {
  return (
    <div style={{...cardBase, background: '#d9dde0'}}>
      <ImageFill
        driftY={20}
        image={card.backgroundImage || card.image}
        localFrame={localFrame}
        scaleFrom={1.07}
      />
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.18)',
          inset: 0,
          position: 'absolute',
        }}
      />
      <div
        style={{
          color: '#fff',
          fontFamily: instrumentSerif,
          fontSize: 48,
          fontStyle: 'italic',
          left: 43,
          lineHeight: 0.958,
          position: 'absolute',
          top: 51,
          whiteSpace: 'pre-line',
          ...fadeScale(localFrame, 0, 0.92),
        }}
      >
        {asText(card.title, 'Fact\nnumber\nOne')}
      </div>
      <Counter localFrame={localFrame + 8} value={asText(card.counter, '3/6')} />
    </div>
  );
}

function Card4({card, localFrame}: {card: CardSlot; localFrame: number}) {
  return (
    <div style={{...cardBase, background: '#d9dde0'}}>
      <div
        style={{
          color: '#d61e23',
          fontFamily: instrumentSerif,
          fontSize: 48,
          fontStyle: 'italic',
          left: 43,
          lineHeight: 0.958,
          position: 'absolute',
          top: 51,
          whiteSpace: 'pre-line',
          ...slideX(localFrame, 0, -18),
        }}
      >
        {asText(card.title, 'Fact\nnumber\nTwo')}
      </div>
      <div
        style={{
          color: '#1e1e1e',
          fontFamily: instrumentSans,
          fontSize: 16,
          left: 43,
          lineHeight: 1.4,
          position: 'absolute',
          top: 228,
          width: 386,
          ...fadeScale(localFrame, 6, 0.96),
        }}
      >
        {asText(card.text)}
      </div>
      <Thumb image={card.image} localFrame={localFrame + 3} />
      <Counter localFrame={localFrame + 6} value={asText(card.counter, '4/6')} />
    </div>
  );
}

function Card5({card, localFrame}: {card: CardSlot; localFrame: number}) {
  return (
    <div style={{...cardBase, background: '#d9dde0'}}>
      <ImageFill
        driftX={-18}
        image={card.backgroundImage || card.image}
        localFrame={localFrame}
        scaleFrom={1.06}
      />
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          inset: 0,
          position: 'absolute',
        }}
      />
      <div
        style={{
          color: '#fff',
          fontFamily: instrumentSerif,
          fontSize: 48,
          fontStyle: 'italic',
          left: 43,
          lineHeight: 0.958,
          position: 'absolute',
          top: 51,
          whiteSpace: 'pre-line',
          ...motion(localFrame, 2, 26),
        }}
      >
        {asText(card.title, 'Fact\nnumber\nThree')}
      </div>
      <Counter localFrame={localFrame + 8} value={asText(card.counter, '5/6')} />
    </div>
  );
}

function Card6({card, localFrame}: {card: CardSlot; localFrame: number}) {
  const brandLeft = asText(card.brandLeft, 'helloiam');
  const brandRight = asText(card.brandRight, 'am');
  const source = mediaSource(card.image);
  const emojiTurn = interpolate(localFrame, [0, 18], [-18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{...cardBase, background: '#d9dde0'}}>
      <div
        style={{
          alignItems: 'center',
          color: '#420000',
          display: 'flex',
          fontFamily: instrumentSans,
          fontSize: 48,
          fontWeight: 700,
          gap: 12,
          justifyContent: 'center',
          left: 0,
          lineHeight: 0.958,
          position: 'absolute',
          textAlign: 'center',
          top: 256,
          whiteSpace: 'pre',
          width: 600,
          ...fadeScale(localFrame, 0, 0.97),
        }}
      >
        <span>{brandLeft}</span>
        {source ? (
          <Img
            src={source}
            style={{
              height: 36,
              objectFit: 'contain',
              transform: `rotate(${emojiTurn}deg)`,
              width: 36,
            }}
          />
        ) : null}
        <span>{brandRight}</span>
      </div>
      <div
        style={{
          color: '#420000',
          fontFamily: instrumentSerif,
          fontSize: 22,
          fontStyle: 'italic',
          left: 0,
          lineHeight: 1,
          position: 'absolute',
          textAlign: 'center',
          top: 323,
          width: 600,
          ...motion(localFrame, 8, 14),
        }}
      >
        {asText(card.subtitle, 'Say Hello\nto Armenia')}
      </div>
    </div>
  );
}

function cardSlots(props: TemplateRenderProps) {
  return [props.card1, props.card2, props.card3, props.card4, props.card5, props.card6].map(
    (card) => card || {},
  );
}

export const ArmenianFoodCarousel: React.FC<TemplateRenderProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const cards = cardSlots(props);
  const cardCount = props.workflow?.cardCount || cards.length;
  const segmentFrames = Math.max(1, Math.floor(durationInFrames / cardCount));
  const activeIndex = Math.min(cards.length - 1, Math.floor(frame / segmentFrames));
  const localFrame = frame - activeIndex * segmentFrames;
  const enter = interpolate(localFrame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(localFrame, [0, 14], [1.84, 1.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const ActiveCard = [Card2, Card1, Card3, Card4, Card5, Card6][activeIndex] || Card2;

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        background: '#f0f0f0',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        <ActiveCard card={cards[activeIndex] || {}} localFrame={localFrame} />
      </div>
    </AbsoluteFill>
  );
};

export const Template = ArmenianFoodCarousel;

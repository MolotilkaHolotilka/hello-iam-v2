import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Video,
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
  position: 'relative',
  width: 1080,
  height: 1350,
  overflow: 'hidden',
};

const INTRO_IMAGE_LAYOUTS: Record<
  string,
  {left: number; top: number; width: number; height: number}
> = {
  lavash: {left: -182, top: -238, width: 2060, height: 2060},
  dolma: {left: -271, top: 224, width: 1861, height: 1861},
  matsun: {left: -251, top: 0, width: 2478, height: 2478},
};

const INTRO_TITLE_WIDTH: Record<string, number> = {
  lavash: 636,
  dolma: 620,
  matsun: 693,
};

function mediaSource(image?: unknown): string | null {
  if (typeof image !== 'string' || !image) return null;
  if (/^(https?:|data:|file:)/.test(image)) return image;
  if (image.startsWith('/')) return image;
  return staticFile(image.replace(/^public[\\/]/, '').replace(/\\/g, '/'));
}

function isVideoSource(source: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(source);
}

function Media({
  src,
  style,
}: {
  src: string;
  style: React.CSSProperties;
}) {
  if (isVideoSource(src)) {
    return <Video src={src} muted loop style={style} />;
  }
  return <Img src={src} style={style} />;
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
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

function useCardTransition(localFrame: number) {
  return interpolate(localFrame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

function Card1Hello({
  card,
  localFrame,
  segmentFrames,
}: {
  card: CardSlot;
  localFrame: number;
  segmentFrames: number;
}) {
  const cardOpacity = useCardTransition(localFrame);
  const bgScale = interpolate(localFrame, [0, segmentFrames], [1.05, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const image = mediaSource(card.image);
  const title = asText(card.title, 'HELLO, I AM');
  const accent = asText(card.titleAccent, '');
  const label = asText(card.label, 'AM FOOD');
  const background = asText(card.background, '#d9dde0');
  const titleColor = asText(card.titleColor, '#0f0f10');
  const accentColor = asText(card.accentColor, titleColor);
  const labelColor = asText(card.labelColor, '#000000');
  const introLayout = asText(card.introLayout, 'lavash');
  const imageBox = INTRO_IMAGE_LAYOUTS[introLayout] || INTRO_IMAGE_LAYOUTS.lavash;
  const titleWidth = INTRO_TITLE_WIDTH[introLayout] || 636;

  return (
    <div style={{...cardBase, background, opacity: cardOpacity}}>
      {image ? (
        <div
          style={{
            position: 'absolute',
            left: imageBox.left,
            top: imageBox.top,
            width: imageBox.width,
            height: imageBox.height,
            ...motion(localFrame, 4, 60),
          }}
        >
          <Media
            src={image}
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
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          width: titleWidth,
          height: 468,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 164,
          lineHeight: '156px',
          textTransform: 'uppercase',
          whiteSpace: 'pre-line',
          ...slideX(localFrame, 0, -50),
        }}
      >
        <div style={{color: titleColor, whiteSpace: 'pre-line'}}>{title}</div>
        {accent ? <div style={{color: accentColor, whiteSpace: 'pre-line'}}>{accent}</div> : null}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 1285,
          width: 248,
          height: 32,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 26,
          lineHeight: '32px',
          display: 'flex',
          alignItems: 'flex-end',
          textTransform: 'uppercase',
          color: labelColor,
          ...motion(localFrame, 18, 14),
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Card2Quote({
  card,
  localFrame,
  segmentFrames,
}: {
  card: CardSlot;
  localFrame: number;
  segmentFrames: number;
}) {
  const cardOpacity = useCardTransition(localFrame);
  const image = mediaSource(card.image);
  const float = interpolate(localFrame, [0, segmentFrames], [-4, 4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const tilt = interpolate(localFrame, [0, segmentFrames], [-0.8, 0.8], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const title = asText(card.title, 'HELLO, I AM');
  const titleAccent = asText(card.titleAccent, '');
  const quote = asText(card.quote, '');
  const label = asText(card.label, 'AM FOOD');
  const background = asText(card.background, '#d9dde0');
  const quoteColor = asText(card.quoteColor, '#d61e23');
  const titleColor = asText(card.titleColor, '#0f0f10');
  const accentColor = asText(card.accentColor, titleColor);
  const labelColor = asText(card.labelColor, '#000000');
  const headerLine: React.CSSProperties = {
    fontFamily: instrumentSans,
    fontWeight: 700,
    fontSize: 44,
    lineHeight: '54px',
    textTransform: 'uppercase',
    whiteSpace: 'pre-line',
  };

  return (
    <div style={{...cardBase, background, opacity: cardOpacity}}>
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          width: 298,
          height: 108,
          ...slideX(localFrame, 0, -30),
        }}
      >
        <div style={{...headerLine, color: titleColor, whiteSpace: 'nowrap'}}>
          {title}
        </div>
        {titleAccent ? (
          <div style={{...headerLine, color: accentColor}}>{titleAccent}</div>
        ) : null}
      </div>

      {image ? (
        <div
          style={{
            position: 'absolute',
            left: 28,
            top: 235,
            width: 1024,
            height: 645,
            overflow: 'hidden',
            ...fadeScale(localFrame, 4, 0.94),
          }}
        >
          <Media
            src={image}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              transform: `translateY(${float}px) rotate(${tilt}deg)`,
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 928,
          width: 830,
          fontFamily: instrumentSerif,
          fontStyle: 'normal',
          fontWeight: 400,
          fontSize: 63,
          lineHeight: '55px',
          color: quoteColor,
          ...motion(localFrame, 14, 24),
        }}
      >
        {quote}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 1285,
          width: 248,
          height: 32,
          fontFamily: instrumentSans,
          fontWeight: 700,
          fontSize: 26,
          lineHeight: '32px',
          display: 'flex',
          alignItems: 'flex-end',
          textTransform: 'uppercase',
          color: labelColor,
          ...motion(localFrame, 22, 14),
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Card3Brand({
  card,
  localFrame,
  segmentFrames,
}: {
  card: CardSlot;
  localFrame: number;
  segmentFrames: number;
}) {
  const cardOpacity = useCardTransition(localFrame);
  const image = mediaSource(card.image);
  const emojiTilt = interpolate(
    localFrame,
    [0, 24, segmentFrames],
    [-22, 0, 6],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const brandLeft = asText(card.brandLeft, 'helloiam');
  const brandRight = asText(card.brandRight, 'am');
  const background = asText(card.background, '#d9dde0');
  const brandColor = asText(card.brandColor, '#420000');

  return (
    <div style={{...cardBase, background, opacity: cardOpacity}}>
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
          color: brandColor,
          ...fadeScale(localFrame, 0, 0.94),
        }}
      >
        <span style={slideX(localFrame, 6, -60)}>{brandLeft}</span>
        {image ? (
          <Media
            src={image}
            style={{
              width: 180,
              height: 180,
              objectFit: 'contain',
              transform: `rotate(${emojiTilt}deg)`,
              ...fadeScale(localFrame, 10, 0.6),
            }}
          />
        ) : null}
        <span style={slideX(localFrame, 6, 60)}>{brandRight}</span>
      </div>
    </div>
  );
}

function pickCard(index: number, total: number, card: CardSlot) {
  if (index === 0 && asText(card.quote) && !asText(card.introLayout)) {
    return Card2Quote;
  }
  if (index === 0) return Card1Hello;
  if (index === total - 1) return Card3Brand;
  return Card2Quote;
}

function cardSlots(props: TemplateRenderProps): CardSlot[] {
  const slots = [
    props.card1,
    props.card2,
    props.card3,
    props.card4,
    props.card5,
    props.card6,
    props.card7,
  ];
  const requested = props.workflow?.cardCount || slots.filter(Boolean).length || 3;
  return slots.slice(0, requested).map((card) => card || {});
}

export const GreenPlateIntroTemplate: React.FC<TemplateRenderProps> = (props) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const cards = cardSlots(props);
  const cardCount = cards.length;
  const durationPerCardFromWorkflow = Number(props.workflow?.durationPerCardFrames);
  const segmentFrames =
    Number.isFinite(durationPerCardFromWorkflow) && durationPerCardFromWorkflow > 0
      ? durationPerCardFromWorkflow
      : Math.max(1, Math.floor(durationInFrames / cardCount));
  const activeIndex = Math.min(cardCount - 1, Math.floor(frame / segmentFrames));
  const localFrame = frame - activeIndex * segmentFrames;
  const ActiveCard = pickCard(activeIndex, cardCount, cards[activeIndex] || {});

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        background: '#f0f0f0',
        justifyContent: 'center',
      }}
    >
      <ActiveCard
        card={cards[activeIndex] || {}}
        localFrame={localFrame}
        segmentFrames={segmentFrames}
      />
    </AbsoluteFill>
  );
};

export const Template = GreenPlateIntroTemplate;

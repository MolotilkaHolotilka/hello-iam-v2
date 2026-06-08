import type {FC} from 'react';

export type AnimationPreset = 'clean-rise' | 'slide-fly' | 'soft-float';

type SlideBlock = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  text?: string;
  image?: string;
  video?: string;
  [key: string]: unknown;
};

type CardBlock = {
  title?: string;
  subtitle?: string;
  text?: string;
  image?: string;
  backgroundImage?: string;
  counter?: string;
  brandLeft?: string;
  brandRight?: string;
  [key: string]: unknown;
};

export type TemplateRenderProps = {
  templateId: string;
  format?: string;
  animationPreset: AnimationPreset;
  workflow?: {
    cardCount?: number;
    durationPerCardFrames?: number;
    fps?: number;
  };
  cover?: SlideBlock;
  fact1?: SlideBlock;
  fact2?: SlideBlock;
  fact3?: SlideBlock;
  fact4?: SlideBlock;
  fact5?: SlideBlock;
  fact6?: SlideBlock;
  card1?: CardBlock;
  card2?: CardBlock;
  card3?: CardBlock;
  card4?: CardBlock;
  card5?: CardBlock;
  card6?: CardBlock;
  card7?: CardBlock;
  [key: string]: unknown;
};

export type TemplateComponent = FC<TemplateRenderProps>;

import React from 'react';
import {AbsoluteFill} from 'remotion';
import {templateRegistry} from './registry';
import type {TemplateRenderProps} from './types';

export const TEMPLATE_RENDER_DURATION = 180;
export const TEMPLATE_RENDER_PORTRAIT_DURATION = 630;

export const DEFAULT_TEMPLATE_PROPS: TemplateRenderProps = {
  templateId: 'armenian-food-carousel',
  format: 'carousel',
  animationPreset: 'clean-rise',
  workflow: {
    cardCount: 6,
  },
  card1: {
    title: 'HELLO, I AM\nARMENIAN\nLAVASH',
    subtitle: 'Thin bread baked\nin stone oven',
    backgroundImage: 'generated/images/lavash-01.jpg',
    image: 'generated/emoji/emoji-lavash.png',
  },
  card2: {
    title: 'Fact\nnumber\nOne',
    text: 'An old radio/cassette player sits on a wooden table. Nearby: a reel of tape, yellowed sheet music, a cup of coffee, and pomegranate seeds in a small dish. Light streams in from a window, catching dust in the air; a subtle sound wave appears as a thin line hovering above the speaker.',
    image: 'generated/emoji/emoji-lavash.png',
    counter: '1/6',
  },
  card3: {
    title: 'Fact\nnumber\nOne',
    backgroundImage: 'generated/images/lavash-01.jpg',
    counter: '1/6',
  },
  card4: {
    title: 'Fact\nnumber\nTwo',
    text: 'An old radio/cassette player sits on a wooden table. Nearby: a reel of tape, yellowed sheet music, a cup of coffee, and pomegranate seeds in a small dish. Light streams in from a window, catching dust in the air; a subtle sound wave appears as a thin line hovering above the speaker.',
    image: 'generated/emoji/emoji-lavash.png',
    counter: '1/6',
  },
  card5: {
    title: 'Fact\nnumber\nOne',
    backgroundImage: 'generated/images/lavash-01.jpg',
    counter: '1/6',
  },
  card6: {
    brandLeft: 'helloiam',
    brandRight: 'am',
    image: 'generated/emoji/emoji-lavash.png',
    subtitle: 'Say Hello\nto Armenia',
  },
};

export const TemplateRenderer: React.FC<TemplateRenderProps> = (props) => {
  const mergedProps = {
    ...DEFAULT_TEMPLATE_PROPS,
    ...props,
    cover: {
      ...DEFAULT_TEMPLATE_PROPS.cover,
      ...props.cover,
    },
    fact1: {
      ...DEFAULT_TEMPLATE_PROPS.fact1,
      ...props.fact1,
    },
    fact2: {
      ...DEFAULT_TEMPLATE_PROPS.fact2,
      ...props.fact2,
    },
    fact3: {
      ...DEFAULT_TEMPLATE_PROPS.fact3,
      ...props.fact3,
    },
    fact4: {
      ...DEFAULT_TEMPLATE_PROPS.fact4,
      ...props.fact4,
    },
    fact5: {
      ...DEFAULT_TEMPLATE_PROPS.fact5,
      ...props.fact5,
    },
    fact6: props.fact6 || {},
    card1: {
      ...DEFAULT_TEMPLATE_PROPS.card1,
      ...props.card1,
    },
    card2: {
      ...DEFAULT_TEMPLATE_PROPS.card2,
      ...props.card2,
    },
    card3: {
      ...DEFAULT_TEMPLATE_PROPS.card3,
      ...props.card3,
    },
    card4: {
      ...DEFAULT_TEMPLATE_PROPS.card4,
      ...props.card4,
    },
    card5: {
      ...DEFAULT_TEMPLATE_PROPS.card5,
      ...props.card5,
    },
    card6: {
      ...DEFAULT_TEMPLATE_PROPS.card6,
      ...props.card6,
    },
    workflow: {
      ...DEFAULT_TEMPLATE_PROPS.workflow,
      ...props.workflow,
    },
  };
  const Component = templateRegistry[mergedProps.templateId];

  if (!Component) {
    return (
      <AbsoluteFill
        style={{
          alignItems: 'center',
          backgroundColor: '#f8fafc',
          color: '#991b1b',
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 42,
          justifyContent: 'center',
          padding: 80,
          textAlign: 'center',
        }}
      >
        Unknown template: {mergedProps.templateId}
      </AbsoluteFill>
    );
  }

  return <Component {...mergedProps} />;
};

export const FPS = 30 as const;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** How each clip meets the previous / next clip at the edit boundary. */
export type TransitionEdge = 'cut' | 'dissolve' | 'fade';

export type ShotDefinition = {
  /** Basename under `public/frames/`. */
  asset: string;
  durationFrames: number;
  text: string;
  /** Hero uses Instrument Sans / primary; body uses Instrument Serif / ink. */
  textVariant: 'hero' | 'body';
  enter: TransitionEdge;
  exit: TransitionEdge;
};

/**
 * Timing locked to `content/storyboards/001_first-hello_i-am.md`.
 * Replace SVG placeholders in `public/frames/` with final raster artwork (PNG/WebP)
 * — keep filenames stable or update `asset`.
 */
export const POST001_SHOTS: ShotDefinition[] = [
  {
    asset: '001-shot-01.svg',
    durationFrames: 60,
    text: 'I AM _',
    textVariant: 'hero',
    enter: 'fade',
    exit: 'cut',
  },
  {
    asset: '001-shot-02.svg',
    durationFrames: 54,
    text: 'Not a slogan.',
    textVariant: 'body',
    enter: 'fade',
    exit: 'cut',
  },
  {
    asset: '001-shot-03.svg',
    durationFrames: 54,
    text: 'A first hello.',
    textVariant: 'body',
    enter: 'dissolve',
    exit: 'dissolve',
  },
  {
    asset: '001-shot-04.svg',
    durationFrames: 66,
    text: 'A phrase that opens into a world.',
    textVariant: 'body',
    enter: 'cut',
    exit: 'cut',
  },
  {
    asset: '001-shot-05.svg',
    durationFrames: 60,
    text: 'Food. Streets. Rituals. Objects. Sounds.',
    textVariant: 'body',
    enter: 'dissolve',
    exit: 'dissolve',
  },
  {
    asset: '001-shot-06.svg',
    durationFrames: 66,
    text: 'This is where that world starts to open.',
    textVariant: 'body',
    enter: 'dissolve',
    exit: 'fade',
  },
];

export const POST001_TOTAL_FRAMES = POST001_SHOTS.reduce(
  (acc, s) => acc + s.durationFrames,
  0,
);

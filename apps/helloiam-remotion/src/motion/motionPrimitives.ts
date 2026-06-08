import type {TransitionEdge} from '../compositions/post001';

/** Frame-based motion helpers for Remotion (port patterns from CSS/motion libs manually). */

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const fadeAlpha = (
  relFrame: number,
  fadeInFrames: number,
  fadeOutFrames: number,
  durationInFrames: number,
): number => {
  const fadeIn = fadeInFrames > 0 ? clamp01(relFrame / fadeInFrames) : 1;
  const fadeOut =
    fadeOutFrames > 0
      ? clamp01((durationInFrames - 1 - relFrame) / fadeOutFrames)
      : 1;
  return Math.min(fadeIn, fadeOut);
};

export const resolveFadeFrames = (
  edge: TransitionEdge,
): {fadeIn: number; fadeOut: number} => {
  switch (edge) {
    case 'fade':
      return {fadeIn: 18, fadeOut: 18};
    case 'dissolve':
      return {fadeIn: 16, fadeOut: 16};
    case 'cut':
    default:
      return {fadeIn: 1, fadeOut: 0};
  }
};

/** Subtle editorial drift — swap easing to mirror external motion presets. */
export const editorialDriftScale = (
  relFrame: number,
  durationInFrames: number,
): number => {
  const t = durationInFrames <= 1 ? 1 : relFrame / (durationInFrames - 1);
  const eased = 1 - Math.pow(1 - t, 2);
  return 1.04 - eased * 0.04;
};

/** Soft vertical settle for text blocks. */
export const editorialTextYOffset = (
  relFrame: number,
  settleFrames = 14,
): number => {
  const p = settleFrames <= 0 ? 1 : clamp01(relFrame / settleFrames);
  const eased = 1 - Math.pow(1 - p, 3);
  return (1 - eased) * 24;
};

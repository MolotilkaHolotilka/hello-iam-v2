import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  fontFamily as instrumentSans,
  loadFont as loadInstrumentSans,
} from '@remotion/google-fonts/InstrumentSans';

loadInstrumentSans();

// Canvas
const W = 1080;

// Brand card visual constants
const BRAND_COLOR = '#420000';
const BG_COLOR = '#d9dde0';
const FONT_SIZE = 96;
const EMOJI_SIZE = 180;
const ROW_GAP = 24;
const ROW_TOP = 588;

// Estimated text widths at 96px Instrument Sans Bold
const HELLOIAM_W = 474;
const AM_W = 128;

// Derived layout positions
const ROW_W = HELLOIAM_W + ROW_GAP + EMOJI_SIZE + ROW_GAP + AM_W;
const ROW_LEFT = (W - ROW_W) / 2;
const EMOJI_CENTER_X = ROW_LEFT + HELLOIAM_W + ROW_GAP + EMOJI_SIZE / 2;
const AM_LEFT_X = ROW_LEFT + HELLOIAM_W + ROW_GAP + EMOJI_SIZE + ROW_GAP;
const AM_CENTER_X = AM_LEFT_X + AM_W / 2;
const ROW_CENTER_Y = ROW_TOP + EMOJI_SIZE / 2; // 678

// Text clip container — text sits in overflow:hidden box, rises from below
const TEXT_TOP = ROW_TOP + (EMOJI_SIZE - FONT_SIZE) / 2 - 4; // vertically centered in row
const TEXT_H = FONT_SIZE + 12; // clip height

// Apricot landing Y — just above "am" top edge so it sits ON the text, not inside it
const LAND_Y = TEXT_TOP - EMOJI_SIZE / 2 + 18; // apricot bottom ≈ top of "am"

// ── Timeline (frames @ 30fps) ──────────────────────────────────────
// Text reveal phase
const H_LINE_IN = [0, 16] as const;    // helloiam: line sweeps in
const H_LINE_OUT = [20, 34] as const;  // helloiam: line sweeps out
const H_TEXT_UP = [6, 24] as const;    // helloiam: text rises

const A_LINE_IN = [10, 26] as const;   // am: line sweeps in
const A_LINE_OUT = [30, 44] as const;  // am: line sweeps out
const A_TEXT_UP = [16, 32] as const;   // am: text rises

// Apricot animation (starts after text is settled)
const FLY_START = 38;
const LAND_FRAME = 84;
const SQUISH_PEAK = 92;
const BOUNCE_LAUNCH = 98;
const DOT_ARRIVE = 130;
const SETTLE_END = 158;
export const APRICOT_BOUNCE_DURATION = 168; // 5.6 seconds

// ── Helpers ────────────────────────────────────────────────────────
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

function lerp(frame: number, [a, b]: readonly [number, number], [from, to]: [number, number], easing?: (t: number) => number) {
  return interpolate(frame, [a, b], [from, to], {
    ...clamp,
    easing,
  });
}

// Clamp t to [0, 1]
function clampT(frame: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (frame - start) / (end - start)));
}

// Line clipPath: sweeps in from left then sweeps out to right
function lineClip(frame: number, inRange: readonly [number, number], outRange: readonly [number, number]) {
  const sweepIn = lerp(frame, inRange, [0, 1], Easing.out(Easing.cubic));
  const sweepOut = frame >= outRange[0]
    ? lerp(frame, outRange, [0, 1], Easing.in(Easing.cubic))
    : 0;
  const leftPct = sweepOut * 100;
  const rightPct = (1 - sweepIn) * 100;
  return `inset(0 ${rightPct.toFixed(1)}% 0 ${leftPct.toFixed(1)}%)`;
}

// Text rise: rises up through overflow:hidden container
function textRise(frame: number, upRange: readonly [number, number]) {
  const progress = lerp(frame, upRange, [0, 1], Easing.out(Easing.cubic));
  return `translateY(${((1 - progress) * TEXT_H).toFixed(1)}px)`;
}

export const ApricotBounce: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // ── Arc 1: fly in from right ────────────────────────────────────
  // General parabola: lerp(t, startY, endY) - arc_height * sin(PI*t)
  // so start and end can be at DIFFERENT heights
  const t1 = clampT(frame, FLY_START, LAND_FRAME);
  const t1x = Easing.inOut(Easing.sin)(t1);
  const arc1X = interpolate(t1x, [0, 1], [W + 120, AM_CENTER_X]);
  // Starts at ROW_CENTER_Y (off-screen right), lands at LAND_Y (above "am")
  const arc1Y = ROW_CENTER_Y + t1 * (LAND_Y - ROW_CENTER_Y) - 220 * Math.sin(Math.PI * t1);

  // ── Arc 2: bounce from "am" to dot position ─────────────────────
  // Starts at LAND_Y, ends at ROW_CENTER_Y (final emoji center)
  const t2 = clampT(frame, BOUNCE_LAUNCH, DOT_ARRIVE);
  const t2x = Easing.inOut(Easing.sin)(t2);
  const arc2X = interpolate(t2x, [0, 1], [AM_CENTER_X, EMOJI_CENTER_X]);
  const arc2Y = LAND_Y + t2 * (ROW_CENTER_Y - LAND_Y) - 180 * Math.sin(Math.PI * t2);

  // ── Settle at dot: spring for natural damped bounce ─────────────
  const settleY = spring({
    frame: Math.max(0, frame - DOT_ARRIVE),
    fps,
    config: {mass: 0.7, damping: 9, stiffness: 160},
    from: 18,   // arrives slightly below (momentum from arc)
    to: 0,
  });

  // ── Compose X ───────────────────────────────────────────────────
  let apricotX: number;
  if (frame < FLY_START)          apricotX = W + 120;
  else if (frame <= LAND_FRAME)   apricotX = arc1X;
  else if (frame < BOUNCE_LAUNCH) apricotX = AM_CENTER_X;
  else if (frame <= DOT_ARRIVE)   apricotX = arc2X;
  else                            apricotX = EMOJI_CENTER_X;

  // ── Compose Y ───────────────────────────────────────────────────
  let apricotY: number;
  if (frame < FLY_START) {
    apricotY = ROW_CENTER_Y;
  } else if (frame <= LAND_FRAME) {
    apricotY = arc1Y;
  } else if (frame <= SQUISH_PEAK) {
    // Land at LAND_Y, apricot sinks slightly into "am" during squish
    const tSq = Easing.out(Easing.quad)(clampT(frame, LAND_FRAME, SQUISH_PEAK));
    apricotY = LAND_Y + tSq * 16;
  } else if (frame < BOUNCE_LAUNCH) {
    // Spring back up to launch
    const tLaunch = Easing.in(Easing.quad)(clampT(frame, SQUISH_PEAK, BOUNCE_LAUNCH));
    apricotY = LAND_Y + (1 - tLaunch) * 16;
  } else if (frame <= DOT_ARRIVE) {
    apricotY = arc2Y;
  } else {
    // Damped spring settle
    apricotY = ROW_CENTER_Y + settleY;
  }

  // ── Squish on landing (softer, with easing) ─────────────────────
  const squishT = clampT(frame, LAND_FRAME, SQUISH_PEAK);
  const squishEased = Math.sin(Math.PI * squishT); // peaks at 0.5, returns to 0
  const apricotScaleX = 1 + 0.22 * squishEased;
  const apricotScaleY = 1 - 0.26 * squishEased;

  // ── "am" trampoline (smooth bell curve) ─────────────────────────
  const trampolineT = clampT(frame, LAND_FRAME, BOUNCE_LAUNCH + 6);
  const trampolineBell = Math.sin(Math.PI * trampolineT);
  const amScaleY = 1 - 0.22 * trampolineBell;     // compress then overshoot
  const amOvershoot = interpolate(
    frame,
    [BOUNCE_LAUNCH, BOUNCE_LAUNCH + 6, BOUNCE_LAUNCH + 12],
    [0, 0.14, 0],
    clamp,
  );
  const amFinalScaleY = amScaleY + amOvershoot;

  // ── Rotation: rolls in, settles to final tilt ───────────────────
  let apricotRotation: number;
  if (frame < FLY_START) {
    apricotRotation = 12;
  } else if (frame <= LAND_FRAME) {
    apricotRotation = lerp(frame, [FLY_START, LAND_FRAME], [12, 0]);
  } else if (frame < BOUNCE_LAUNCH) {
    apricotRotation = 0;
  } else if (frame <= DOT_ARRIVE) {
    apricotRotation = lerp(frame, [BOUNCE_LAUNCH, DOT_ARRIVE], [0, -22], Easing.out(Easing.cubic));
  } else {
    apricotRotation = -22;
  }

  const apricotOpacity = lerp(frame, [FLY_START, FLY_START + 4], [0, 1]);

  // ── Line clip paths ─────────────────────────────────────────────
  const helloiamLineClip = lineClip(frame, H_LINE_IN, H_LINE_OUT);
  const amLineClip = lineClip(frame, A_LINE_IN, A_LINE_OUT);

  // ── Text rise transforms ────────────────────────────────────────
  const helloiamTranslate = textRise(frame, H_TEXT_UP);
  const amTranslate = textRise(frame, A_TEXT_UP);

  return (
    <AbsoluteFill style={{background: BG_COLOR}}>

      {/* ── "helloiam" sweep line ─────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: TEXT_TOP + TEXT_H,
          left: ROW_LEFT,
          width: HELLOIAM_W,
          height: 3,
          background: BRAND_COLOR,
          clipPath: helloiamLineClip,
        }}
      />

      {/* ── "helloiam" text (overflow:hidden reveal) ─────────── */}
      <div
        style={{
          position: 'absolute',
          top: TEXT_TOP,
          left: ROW_LEFT,
          height: TEXT_H,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontFamily: instrumentSans,
            fontWeight: 700,
            fontSize: FONT_SIZE,
            lineHeight: 0.958,
            color: BRAND_COLOR,
            whiteSpace: 'nowrap',
            transform: helloiamTranslate,
          }}
        >
          helloiam
        </div>
      </div>

      {/* ── "am" sweep line ──────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: TEXT_TOP + TEXT_H,
          left: AM_LEFT_X,
          width: AM_W,
          height: 3,
          background: BRAND_COLOR,
          clipPath: amLineClip,
        }}
      />

      {/* ── "am" text (overflow:hidden reveal) ───────────────── */}
      <div
        style={{
          position: 'absolute',
          top: TEXT_TOP,
          left: AM_LEFT_X,
          height: TEXT_H,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontFamily: instrumentSans,
            fontWeight: 700,
            fontSize: FONT_SIZE,
            lineHeight: 0.958,
            color: BRAND_COLOR,
            whiteSpace: 'nowrap',
            transform: amTranslate,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: `scaleY(${amFinalScaleY})`,
              transformOrigin: 'bottom center',
            }}
          >
            am
          </span>
        </div>
      </div>

      {/* ── Flying apricot ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          left: apricotX - EMOJI_SIZE / 2,
          top: apricotY - EMOJI_SIZE / 2,
          width: EMOJI_SIZE,
          height: EMOJI_SIZE,
          opacity: apricotOpacity,
          transform: `rotate(${apricotRotation}deg) scaleX(${apricotScaleX}) scaleY(${apricotScaleY})`,
          transformOrigin: 'center bottom',
        }}
      >
        <Img
          src={staticFile('posts/701/701_emoji.png')}
          style={{width: '100%', height: '100%', objectFit: 'contain'}}
        />
      </div>
    </AbsoluteFill>
  );
};

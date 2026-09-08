/*
 * The dial's non-linear scale.
 *
 * A linear 0-1000 dial would spend nine tenths of its sweep on speeds most
 * connections never reach, and cram the 0-100 range everybody actually lives in
 * into the first few degrees. Giving each labelled stop an equal slice of the
 * arc instead means the needle moves visibly on a 30 Mbit link and still has
 * somewhere to go on a gigabit one. This is the behaviour that makes the dial
 * read as a speed test rather than as a generic progress meter.
 */

export const GAUGE_STOPS = [0, 1, 5, 10, 20, 30, 50, 75, 100, 250, 500, 750, 1000] as const;

/** Degrees. The arc opens downward, leaving a gap for the connection bar. */
export const ARC_START_DEG = 135;
export const ARC_SWEEP_DEG = 270;

const MAX = GAUGE_STOPS[GAUGE_STOPS.length - 1];
const SEGMENTS = GAUGE_STOPS.length - 1;

/** Maps a speed in Mbit/s onto 0..1 along the arc. */
export function speedToFraction(mbps: number): number {
  if (!Number.isFinite(mbps) || mbps <= 0) return 0;
  if (mbps >= MAX) return 1;

  for (let i = 0; i < SEGMENTS; i++) {
    const lo = GAUGE_STOPS[i];
    const hi = GAUGE_STOPS[i + 1];
    if (mbps <= hi) {
      const within = (mbps - lo) / (hi - lo);
      return (i + within) / SEGMENTS;
    }
  }
  return 1;
}

/** Inverse of {@link speedToFraction}; used to place the tick labels. */
export function fractionToAngle(fraction: number): number {
  return ARC_START_DEG + Math.max(0, Math.min(1, fraction)) * ARC_SWEEP_DEG;
}

export function speedToAngle(mbps: number): number {
  return fractionToAngle(speedToFraction(mbps));
}

/** SVG coordinates for a point on the dial, with y growing downward. */
export function polar(cx: number, cy: number, radius: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/**
 * An SVG arc path between two fractions of the sweep.
 * Kept as a path (rather than a stroked circle with dash offsets) so the
 * rounded caps sit exactly on the ends of the visible range.
 */
export function arcPath(
  cx: number,
  cy: number,
  radius: number,
  fromFraction: number,
  toFraction: number
): string {
  const a0 = fractionToAngle(fromFraction);
  const a1 = fractionToAngle(Math.max(fromFraction, toFraction));
  const start = polar(cx, cy, radius, a0);
  const end = polar(cx, cy, radius, a1);
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

/** The labelled major ticks, with the angle each one sits at. */
export function majorTicks() {
  return GAUGE_STOPS.map((value, i) => ({
    value,
    fraction: i / SEGMENTS,
    angle: fractionToAngle(i / SEGMENTS),
  }));
}

/**
 * Minor ticks subdividing every segment. They are what gives the dial its
 * machined look; without them the arc reads as a plain donut chart.
 */
export function minorTicks(perSegment = 5) {
  const ticks: { fraction: number; angle: number }[] = [];
  for (let s = 0; s < SEGMENTS; s++) {
    for (let k = 1; k < perSegment; k++) {
      const fraction = (s + k / perSegment) / SEGMENTS;
      ticks.push({ fraction, angle: fractionToAngle(fraction) });
    }
  }
  return ticks;
}

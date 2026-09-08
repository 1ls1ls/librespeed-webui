"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  arcPath,
  fractionToAngle,
  majorTicks,
  minorTicks,
  polar,
  speedToFraction,
} from "@/lib/gauge-scale";
import { formatSpeed } from "@/lib/format";
import type { TestPhase } from "@/lib/types";

import styles from "./Gauge.module.css";

/*
 * Geometry, in viewBox units. Fixed rather than measured: the whole dial scales
 * with the SVG, so one set of numbers holds at every size and there is no
 * resize observer in the hot path.
 */
const SIZE = 420;
const C = SIZE / 2;
const R_ARC = 200; // progress arc, outermost
const R_TICK_OUT = 186;
const R_TICK_IN_MINOR = 176;
const R_TICK_IN_MAJOR = 168;
const R_LABEL = 152;

// The mask that lights up ticks is a single thick arc covering the tick band.
const R_MASK = (R_TICK_OUT + R_TICK_IN_MAJOR) / 2;
const MASK_WIDTH = R_TICK_OUT - R_TICK_IN_MAJOR + 10;

/**
 * Time constant of the needle, in milliseconds.
 *
 * The engine only reports every 200 ms, so without smoothing the dial would
 * advance in five visible steps a second. Easing toward each new reading makes
 * the movement continuous while still settling well inside the next update, so
 * the dial never lags behind the number it is showing.
 */
const TAU = 110;

export interface GaugeProps {
  /** The figure shown in the middle, in whatever unit the phase measures. */
  value: number;
  /**
   * What the dial itself points at, always in Mbit/s.
   *
   * It is separate from `value` because the latency phase has a number worth
   * showing but nothing meaningful to point at: milliseconds have no position
   * on a throughput scale, so the dial stays at rest while the readout counts.
   */
  arcValue: number;
  unit: string;
  format: (value: number) => string;
  phase: TestPhase;
  children?: React.ReactNode;
}

export function Gauge({ value, arcValue, unit, format, phase, children }: GaugeProps) {
  const maskRef = useRef<SVGPathElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGCircleElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  /*
   * Read by the animation loop; written on every render. Keeping the targets in
   * refs is what lets the loop run without re-rendering React sixty times a
   * second — the component re-renders only when the phase changes.
   */
  const readoutTargetRef = useRef(0);
  const arcTargetRef = useRef(0);
  const formatRef = useRef(format);
  readoutTargetRef.current = Number.isFinite(value) ? value : 0;
  arcTargetRef.current = Number.isFinite(arcValue) ? arcValue : 0;
  formatRef.current = format;

  const active = phase === "download" || phase === "upload" || phase === "ping";

  const ticks = useMemo(() => {
    const major = majorTicks().map((tick) => {
      const outer = polar(C, C, R_TICK_OUT, tick.angle);
      const inner = polar(C, C, R_TICK_IN_MAJOR, tick.angle);
      const label = polar(C, C, R_LABEL, tick.angle);
      return { ...tick, outer, inner, label };
    });
    const minor = minorTicks().map((tick) => ({
      ...tick,
      outer: polar(C, C, R_TICK_OUT, tick.angle),
      inner: polar(C, C, R_TICK_IN_MINOR, tick.angle),
    }));
    return { major, minor };
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    let readout = 0;
    let arc = 0;

    const step = (now: number) => {
      const dt = Math.min(100, now - previous);
      previous = now;

      // Exponential approach, framerate-independent: the same visual response
      // on a 60 Hz laptop and a 144 Hz monitor.
      const decay = 1 - Math.exp(-dt / TAU);

      readout += (readoutTargetRef.current - readout) * decay;
      if (Math.abs(readoutTargetRef.current - readout) < 0.005) readout = readoutTargetRef.current;

      arc += (arcTargetRef.current - arc) * decay;
      if (Math.abs(arcTargetRef.current - arc) < 0.005) arc = arcTargetRef.current;

      const fraction = speedToFraction(arc);
      const angle = fractionToAngle(fraction);

      // A zero-length arc renders as a stray dot from the round line cap, so
      // the arc and its head stay hidden until there is something to show.
      const visible = fraction > 0.0005;
      arcRef.current?.setAttribute("d", visible ? arcPath(C, C, R_ARC, 0, fraction) : "");
      maskRef.current?.setAttribute("d", visible ? arcPath(C, C, R_MASK, 0, fraction) : "");

      if (headRef.current) {
        const point = polar(C, C, R_ARC, angle);
        headRef.current.setAttribute("cx", point.x.toFixed(2));
        headRef.current.setAttribute("cy", point.y.toFixed(2));
        headRef.current.setAttribute("opacity", visible ? "1" : "0");
      }

      if (readoutRef.current) readoutRef.current.textContent = formatRef.current(readout);

      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, []);

  const trackPath = useMemo(() => arcPath(C, C, R_ARC, 0, 1), []);

  return (
    <div className={styles.gauge} data-phase={phase} data-active={active || undefined}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="gaugeArc" gradientUnits="userSpaceOnUse" x1="0" y1={SIZE} x2={SIZE} y2="0">
            <stop offset="0%" stopColor="var(--c-phase)" />
            <stop offset="100%" stopColor="var(--c-phase-glow)" />
          </linearGradient>

          {/* The bloom around the leading edge. Kept as a blur of the arc
              itself so it always traces the current value exactly. */}
          <filter id="gaugeGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* One path drives which ticks are lit; nothing else changes per frame. */}
          <mask id="gaugeTickMask" maskUnits="userSpaceOnUse">
            <path
              ref={maskRef}
              d=""
              fill="none"
              stroke="#fff"
              strokeWidth={MASK_WIDTH}
              strokeLinecap="butt"
            />
          </mask>
        </defs>

        {/* Unlit scale */}
        <g className={styles.ticksIdle}>
          {ticks.minor.map((tick, i) => (
            <line
              key={`minor-${i}`}
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
            />
          ))}
          {ticks.major.map((tick) => (
            <line
              key={`major-${tick.value}`}
              className={styles.tickMajor}
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
            />
          ))}
        </g>

        {/* The same scale in the phase colour, revealed up to the current value */}
        <g className={styles.ticksLit} mask="url(#gaugeTickMask)">
          {ticks.minor.map((tick, i) => (
            <line
              key={`lit-minor-${i}`}
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
            />
          ))}
          {ticks.major.map((tick) => (
            <line
              key={`lit-major-${tick.value}`}
              className={styles.tickMajor}
              x1={tick.inner.x}
              y1={tick.inner.y}
              x2={tick.outer.x}
              y2={tick.outer.y}
            />
          ))}
        </g>

        <g className={styles.labels}>
          {ticks.major.map((tick) => (
            <text key={`label-${tick.value}`} x={tick.label.x} y={tick.label.y} dy="0.35em">
              {tick.value}
            </text>
          ))}
        </g>

        <path className={styles.track} d={trackPath} />
        <path
          ref={arcRef}
          className={styles.arc}
          d=""
          stroke="url(#gaugeArc)"
          filter="url(#gaugeGlow)"
        />
        <circle ref={headRef} className={styles.head} r="7" cx={C} cy={C} opacity="0" />
      </svg>

      <div className={styles.center}>
        <div className={styles.readout} aria-hidden={!active}>
          <span className={`${styles.readoutValue} num`}>
            <span ref={readoutRef}>{formatSpeed(0)}</span>
          </span>
          <span className={styles.readoutUnit}>{unit}</span>
        </div>
        {children}
      </div>

      {/* The dial itself is decorative; this is what a screen reader follows. */}
      <p className={styles.srOnly} aria-live="polite">
        {active ? `${phase}: ${format(value)} ${unit}` : ""}
      </p>
    </div>
  );
}

/**
 * components/WaveformCanvas.jsx
 * -----------------------------------------------------------------------
 * Draws a signal onto an HTML5 canvas: grid, labelled axes, the waveform
 * itself, and an overlay showing what a given sample rate would capture.
 *
 * Extracted from WaveToolPage so the public read-only share view can draw
 * the same picture without a second copy of the drawing code. The editor
 * and the shared view must agree pixel for pixel - a viewer following a
 * link should see exactly what the author saw.
 *
 * All signal maths stays in utils/waveform.js. This file only turns
 * numbers into pixels.
 * -----------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { generateSamples, isAliased, voltageRange } from "../utils/waveform.js";
import palette from "../theme.js";

/** How many points to use for the smooth reference curve. */
const SMOOTH_SAMPLE_COUNT = 1200;

/** Seconds -> a short label with a sensible unit for the time axis. */
function formatTime(seconds) {
  if (seconds === 0) return "0";
  const abs = Math.abs(seconds);
  if (abs < 1e-3) return `${(seconds * 1e6).toFixed(0)} us`;
  if (abs < 1) return `${(seconds * 1e3).toFixed(abs < 0.01 ? 2 : 1)} ms`;
  return `${seconds.toFixed(2)} s`;
}

/**
 * Draw both traces, the grid and the axis labels.
 *
 * Kept outside the component because it touches no React state - it is a
 * function of (canvas, data), which also makes it easy to reason about.
 */
function drawWaveform(canvas, { smooth, sampled, duration, vMin, vMax, aliased }) {
  const ctx = canvas.getContext("2d");
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) return;

  // A canvas has a CSS size and a separate pixel buffer size. Left equal on
  // a high-DPI screen the buffer is stretched and everything looks soft, so
  // size the buffer by devicePixelRatio and scale the context back, which
  // lets the drawing code below keep working in CSS pixels.
  // Source: MDN, "Correcting resolution in a <canvas>" -
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssWidth * scale);
  canvas.height = Math.floor(cssHeight * scale);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // undo any previous scale before re-applying
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const pad = { left: 58, right: 14, top: 14, bottom: 34 };
  const plotW = cssWidth - pad.left - pad.right;
  const plotH = cssHeight - pad.top - pad.bottom;
  if (plotW <= 0 || plotH <= 0) return;

  // Data coordinates -> pixel coordinates. Canvas y grows downward, hence
  // the subtraction in yOf.
  const xOf = (t) => pad.left + (duration > 0 ? (t / duration) * plotW : 0);
  const span = vMax - vMin;
  const yOf = (v) => pad.top + plotH - (span > 0 ? ((v - vMin) / span) * plotH : plotH / 2);

  // ---- plot background and grid ----------------------------------------
  ctx.fillStyle = palette.display;
  ctx.fillRect(pad.left, pad.top, plotW, plotH);

  ctx.strokeStyle = palette.displayGrid;
  ctx.lineWidth = 1;
  ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillStyle = palette.inkMuted;

  const H_DIVISIONS = 4;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= H_DIVISIONS; i++) {
    const v = vMax - (i / H_DIVISIONS) * span;
    const y = yOf(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
    ctx.fillText(`${v.toFixed(2)} V`, pad.left - 6, y);
  }

  const V_DIVISIONS = 6;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let i = 0; i <= V_DIVISIONS; i++) {
    const t = (i / V_DIVISIONS) * duration;
    const x = xOf(t);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.stroke();
    ctx.fillText(formatTime(t), x, pad.top + plotH + 6);
  }

  // ---- zero volts, emphasised when it is inside the plotted range ------
  if (vMin < 0 && vMax > 0) {
    ctx.strokeStyle = palette.ruleStrong;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, yOf(0));
    ctx.lineTo(pad.left + plotW, yOf(0));
    ctx.stroke();
  }

  // Clip the traces so a large DC offset cannot draw outside the axes.
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, plotW, plotH);
  ctx.clip();

  // ---- the signal itself -----------------------------------------------
  if (smooth.length > 1) {
    ctx.strokeStyle = palette.traceTrue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    smooth.forEach((s, i) => {
      const x = xOf(s.t);
      const y = yOf(s.v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // ---- what the chosen sample rate would actually capture ---------------
  if (sampled.length > 1) {
    ctx.strokeStyle = aliased ? palette.traceAliased : palette.copper;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    sampled.forEach((s, i) => {
      const x = xOf(s.t);
      const y = yOf(s.v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Individual sample points, but only while they are sparse enough to
    // read. Past that they merge into a solid band and add nothing.
    if (sampled.length <= 200) {
      ctx.fillStyle = aliased ? palette.traceAliased : palette.copper;
      for (const s of sampled) {
        ctx.beginPath();
        ctx.arc(xOf(s.t), yOf(s.v), 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }

  ctx.restore();

  // ---- axes drawn last so they sit on top -------------------------------
  ctx.strokeStyle = palette.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
}

/**
 * Canvas element plus the effect that keeps it drawn.
 *
 * Takes a signal description rather than pre-computed samples, so callers
 * do not each have to remember how to derive the smooth curve, the axis
 * range, or the aliasing flag.
 */
export default function WaveformCanvas({
  type,
  amplitude,
  frequency,
  phase,
  offset,
  duration,
  sampleRate,
  height = 320,
}) {
  const canvasRef = useRef(null);

  const signal = { type, amplitude, frequency, phase, offset };
  const smooth = generateSamples({
    ...signal,
    duration,
    // A fixed point count regardless of duration keeps the curve smooth
    // whether the window is a microsecond or a minute.
    sampleRate: duration > 0 ? SMOOTH_SAMPLE_COUNT / duration : 1,
  });
  const sampled = generateSamples({ ...signal, duration, sampleRate });
  const aliased = isAliased(frequency, sampleRate);

  // Scale the vertical axis to the signal, with 10% headroom. A flat line
  // has no range of its own, so give it an arbitrary one to sit inside.
  const range = voltageRange(smooth);
  let vMin = range.min;
  let vMax = range.max;
  if (vMax - vMin < 1e-9) {
    vMin -= 1;
    vMax += 1;
  } else {
    const headroom = (vMax - vMin) * 0.1;
    vMin -= headroom;
    vMax += headroom;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () =>
      drawWaveform(canvas, { smooth, sampled, duration, vMin, vMax, aliased });

    render();
    // The canvas is sized in CSS percentages, so a window resize changes its
    // pixel buffer and wipes the drawing. Redraw on resize.
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  });

  return <canvas ref={canvasRef} className="w-full" style={{ height: `${height}px` }} />;
}

export { formatTime };

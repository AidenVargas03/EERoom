/**
 * utils/waveform.js
 * -----------------------------------------------------------------------
 * Pure waveform math for the Waveform Visualizer. No React, no canvas, no
 * DOM - every function here takes numbers in and returns numbers out, so
 * the signal generation can be unit tested on its own (Milestone 4's unit
 * test requirement) without rendering a component.
 *
 * Signal model. A periodic signal is described by four parameters:
 *
 *     v(t) = amplitude * shape(frac(frequency * t + phase/360)) + offset
 *
 *   amplitude  peak value in volts (not peak-to-peak)
 *   frequency  cycles per second (Hz)
 *   phase      degrees, 0-360, shifts the wave left along the time axis
 *   offset     DC offset in volts, shifts the wave up the voltage axis
 *
 * `frac` is the fractional part, so the argument handed to each shape
 * function is always a position within one cycle in the range [0, 1).
 * That single normalization is why all four shapes are one-liners below.
 *
 * All four shapes are defined so they are in phase with each other at
 * phase = 0: each starts at 0 and rises, except square which starts at
 * its positive level (the standard convention, since a square wave has
 * no zero-crossing to start from).
 *
 * These are the textbook definitions of the four waveforms, implemented
 * from the definitions rather than adapted from any external source, so
 * there is no citation here - same as the Ohm's Law branching in
 * OhmToolPage.jsx.
 * -----------------------------------------------------------------------
 */

/** The tool_type values the waveform tool supports, in display order. */
export const WAVEFORM_TYPES = ["sine", "square", "sawtooth", "triangle"];

/**
 * Fractional part that is always in [0, 1), including for negative input.
 *
 * JavaScript's % keeps the sign of the dividend, so (-0.25 % 1) is -0.25,
 * not 0.75. Every shape function below assumes a position inside one
 * cycle, so a negative value would run them outside their defined range.
 * This matters for negative phase and negative frequency.
 */
function cyclePosition(x) {
  return ((x % 1) + 1) % 1;
}

/**
 * Shape functions. Each takes a position within one cycle, u in [0, 1),
 * and returns a value in [-1, 1]. Amplitude and offset are applied by the
 * caller, so these stay dimensionless and trivial to test.
 */
const SHAPES = {
  // Plain sine over one period.
  sine: (u) => Math.sin(2 * Math.PI * u),

  // 50% duty cycle: positive for the first half of the cycle, negative
  // for the second. Discontinuous at u = 0.5 by definition.
  square: (u) => (u < 0.5 ? 1 : -1),

  // Rising ramp that crosses zero at u = 0 and resets at u = 0.5, which
  // keeps its zero-crossing aligned with sine. Rises 0 -> 1, jumps to -1,
  // rises back to 0.
  sawtooth: (u) => 2 * cyclePosition(u + 0.5) - 1,

  // Linear rise and fall, zero-crossing at u = 0 like sine:
  //   0    -> 0.25  climbs 0 to 1
  //   0.25 -> 0.75  falls 1 to -1
  //   0.75 -> 1     climbs -1 back to 0
  triangle: (u) => {
    if (u < 0.25) return 4 * u;
    if (u < 0.75) return 2 - 4 * u;
    return 4 * u - 4;
  },
};

/**
 * Throws if `value` is not a usable finite number. Catching this here
 * means a bad input fails loudly at the call site instead of silently
 * filling an array with NaN that only shows up as a blank canvas.
 */
function requireFinite(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, received: ${value}`);
  }
}

/**
 * Value of a signal at a single instant.
 *
 * @param {string} type - one of WAVEFORM_TYPES
 * @param {number} t - time in seconds
 * @param {object} params
 * @param {number} params.amplitude - peak volts (default 1)
 * @param {number} params.frequency - Hz (default 1)
 * @param {number} params.phase - degrees (default 0)
 * @param {number} params.offset - DC offset in volts (default 0)
 * @returns {number} volts at time t
 */
export function sampleAt(type, t, params = {}) {
  const shape = SHAPES[type];
  if (!shape) {
    throw new TypeError(
      `Unknown waveform type "${type}". Expected one of: ${WAVEFORM_TYPES.join(", ")}`
    );
  }

  const { amplitude = 1, frequency = 1, phase = 0, offset = 0 } = params;
  requireFinite(t, "t");
  requireFinite(amplitude, "amplitude");
  requireFinite(frequency, "frequency");
  requireFinite(phase, "phase");
  requireFinite(offset, "offset");

  // At frequency 0 this collapses to a constant: the cycle never advances,
  // so the output holds at whatever point of the cycle `phase` selects.
  // That is the correct DC behaviour and needs no special case.
  const u = cyclePosition(frequency * t + phase / 360);
  return amplitude * shape(u) + offset;
}

/**
 * Generate evenly spaced samples of a signal, ready to plot.
 *
 * @param {object} options
 * @param {string} options.type - one of WAVEFORM_TYPES
 * @param {number} options.amplitude - peak volts (default 1)
 * @param {number} options.frequency - Hz (default 1)
 * @param {number} options.phase - degrees (default 0)
 * @param {number} options.offset - DC offset in volts (default 0)
 * @param {number} options.duration - seconds to generate (default 1)
 * @param {number} options.sampleRate - samples per second (default 1000)
 * @returns {Array<{t: number, v: number}>} time/voltage pairs, t ascending
 */
export function generateSamples(options = {}) {
  const {
    type = "sine",
    amplitude = 1,
    frequency = 1,
    phase = 0,
    offset = 0,
    duration = 1,
    sampleRate = 1000,
  } = options;

  requireFinite(duration, "duration");
  requireFinite(sampleRate, "sampleRate");

  if (sampleRate <= 0) {
    throw new RangeError(`sampleRate must be greater than 0, received: ${sampleRate}`);
  }
  // A non-positive duration is a legitimate "nothing to draw yet" state
  // (e.g. an input the user has cleared), not an error.
  if (duration <= 0) return [];

  // Math.floor, then +1, so the series includes both endpoints: a 1 second
  // window at 1000 Hz yields 1001 samples from t=0 to t=1 inclusive.
  const count = Math.floor(duration * sampleRate) + 1;
  const samples = new Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    samples[i] = { t, v: sampleAt(type, t, { amplitude, frequency, phase, offset }) };
  }

  return samples;
}

/**
 * Whether a signal is undersampled at a given sample rate.
 *
 * The Nyquist-Shannon sampling theorem says a signal must be sampled at
 * more than twice its highest frequency to be reconstructed. Below that
 * the plot will show a lower "ghost" frequency that is not really there -
 * aliasing. Worth warning the user about rather than drawing a confidently
 * wrong picture.
 *
 * @returns {boolean} true if frequency is at or above the Nyquist limit
 */
export function isAliased(frequency, sampleRate) {
  requireFinite(frequency, "frequency");
  requireFinite(sampleRate, "sampleRate");
  return Math.abs(frequency) * 2 >= sampleRate;
}

/**
 * Root mean square of a set of samples - the DC voltage that would
 * deliver the same power into the same resistance, which is what an AC
 * voltmeter actually reads.
 *
 * For a pure sine of peak A and no DC offset this converges to A/sqrt(2),
 * which makes it a good analytically-checkable unit test.
 *
 * @param {Array<{v: number}>} samples
 * @returns {number} RMS volts, or 0 for an empty set
 */
export function rms(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return 0;
  const sumOfSquares = samples.reduce((total, s) => total + s.v * s.v, 0);
  return Math.sqrt(sumOfSquares / samples.length);
}

/**
 * Smallest and largest voltage in a set of samples, for scaling the
 * canvas's vertical axis to whatever is actually being drawn.
 *
 * @returns {{min: number, max: number}} both 0 for an empty set
 */
export function voltageRange(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return { min: 0, max: 0 };

  let min = Infinity;
  let max = -Infinity;
  for (const s of samples) {
    if (s.v < min) min = s.v;
    if (s.v > max) max = s.v;
  }
  return { min, max };
}

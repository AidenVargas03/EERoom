/**
 * utils/waveform.test.js
 * -----------------------------------------------------------------------
 * Unit tests for the waveform signal maths (Milestone 4, unit test
 * requirement). Covers normal operation and error conditions, per the
 * Capstone Handbook's requirement that test cases exercise both.
 *
 * Run with: npm test
 *
 * Why these particular assertions. Most check a value the maths textbook
 * already fixes - a sine peaks at +1 a quarter of the way through its
 * cycle, the RMS of a sine is its peak divided by the square root of 2,
 * an undersampled signal aliases to |f - fs|. Nothing in the
 * implementation is told those answers, so a test passing means the
 * implementation independently arrived at a known result.
 *
 * Uses Vitest's describe/it/expect API.
 * Source: Vitest API documentation - https://vitest.dev/api/
 * -----------------------------------------------------------------------
 */

import { describe, it, expect } from "vitest";
import {
  WAVEFORM_TYPES,
  generateSamples,
  isAliased,
  rms,
  sampleAt,
  voltageRange,
} from "./waveform.js";

/**
 * Count how many times a sampled trace crosses zero, and convert that to
 * a frequency. Used to measure what a trace *appears* to be, independent
 * of what it was asked to be - which is how the aliasing tests check that
 * a ghost frequency really is present.
 *
 * A sample sitting exactly on zero is itself a crossing instant, so it is
 * counted once and then skipped, rather than being allowed to register as
 * two sign changes on the way past.
 */
function apparentFrequency(samples, duration) {
  let crossings = 0;
  let lastSign = 0;
  if (samples.length && samples[0].v === 0) crossings++;
  for (const sample of samples) {
    if (sample.v === 0) continue;
    const sign = sample.v > 0 ? 1 : -1;
    if (lastSign !== 0 && sign !== lastSign) crossings++;
    lastSign = sign;
  }
  return crossings / 2 / duration;
}

describe("sampleAt - shape definitions", () => {
  it("starts every shape in phase at t=0, except square which has no rising zero crossing", () => {
    expect(sampleAt("sine", 0)).toBeCloseTo(0, 10);
    expect(sampleAt("triangle", 0)).toBeCloseTo(0, 10);
    expect(sampleAt("sawtooth", 0)).toBeCloseTo(0, 10);
    expect(sampleAt("square", 0)).toBe(1);
  });

  it("puts a 1 Hz sine through 0, +1, 0, -1 at the quarter points", () => {
    expect(sampleAt("sine", 0)).toBeCloseTo(0, 10);
    expect(sampleAt("sine", 0.25)).toBeCloseTo(1, 10);
    expect(sampleAt("sine", 0.5)).toBeCloseTo(0, 10);
    expect(sampleAt("sine", 0.75)).toBeCloseTo(-1, 10);
  });

  it("peaks the triangle at the quarter points and crosses zero at the half", () => {
    expect(sampleAt("triangle", 0.25)).toBeCloseTo(1, 10);
    expect(sampleAt("triangle", 0.5)).toBeCloseTo(0, 10);
    expect(sampleAt("triangle", 0.75)).toBeCloseTo(-1, 10);
  });

  it("flips the square wave at the half cycle", () => {
    expect(sampleAt("square", 0.49)).toBe(1);
    expect(sampleAt("square", 0.51)).toBe(-1);
  });

  it("ramps the sawtooth and resets it at the half cycle", () => {
    expect(sampleAt("sawtooth", 0.49)).toBeCloseTo(0.98, 10);
    expect(sampleAt("sawtooth", 0.51)).toBeCloseTo(-0.98, 10);
  });

  it("exposes exactly the four supported shapes", () => {
    expect(WAVEFORM_TYPES).toEqual(["sine", "square", "sawtooth", "triangle"]);
  });
});

describe("sampleAt - parameters", () => {
  it("scales by amplitude", () => {
    expect(sampleAt("sine", 0.25, { amplitude: 5 })).toBeCloseTo(5, 10);
  });

  it("shifts by DC offset", () => {
    expect(sampleAt("sine", 0, { offset: 3 })).toBeCloseTo(3, 10);
  });

  it("treats 90 degrees of phase as a quarter cycle", () => {
    expect(sampleAt("sine", 0, { phase: 90 })).toBeCloseTo(1, 10);
  });

  it("wraps negative phase into the cycle rather than leaving it out of range", () => {
    expect(sampleAt("sine", 0, { phase: -90 })).toBeCloseTo(-1, 10);
  });
});

describe("sampleAt - edge cases", () => {
  it("holds a constant at 0 Hz, because the cycle never advances", () => {
    expect(sampleAt("sine", 12.34, { frequency: 0, offset: 2 })).toBeCloseTo(2, 10);
    expect(sampleAt("sine", 999, { frequency: 0, offset: 2 })).toBeCloseTo(2, 10);
  });

  it("produces a flat line at zero amplitude", () => {
    expect(sampleAt("triangle", 0.3, { amplitude: 0, offset: 1 })).toBeCloseTo(1, 10);
  });

  it("mirrors the wave for a negative frequency", () => {
    expect(sampleAt("sine", 0.25, { frequency: -1 })).toBeCloseTo(-1, 10);
  });
});

describe("sampleAt - error conditions", () => {
  it("rejects an unknown waveform type", () => {
    expect(() => sampleAt("ramp", 0)).toThrow(TypeError);
  });

  it("rejects a non-finite time", () => {
    expect(() => sampleAt("sine", NaN)).toThrow(TypeError);
    expect(() => sampleAt("sine", Infinity)).toThrow(TypeError);
  });

  it("rejects non-finite parameters", () => {
    expect(() => sampleAt("sine", 0, { amplitude: Infinity })).toThrow(TypeError);
    expect(() => sampleAt("sine", 0, { frequency: NaN })).toThrow(TypeError);
  });

  it("rejects a numeric string rather than silently coercing it", () => {
    expect(() => sampleAt("sine", 0, { amplitude: "5" })).toThrow(TypeError);
  });
});

describe("generateSamples", () => {
  it("includes both endpoints, so one second at 1000 Hz is 1001 samples", () => {
    const samples = generateSamples({ duration: 1, sampleRate: 1000 });
    expect(samples).toHaveLength(1001);
    expect(samples[0].t).toBeCloseTo(0, 10);
    expect(samples[samples.length - 1].t).toBeCloseTo(1, 10);
  });

  it("returns times in ascending order", () => {
    const samples = generateSamples({ duration: 0.1, sampleRate: 100 });
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].t).toBeGreaterThan(samples[i - 1].t);
    }
  });

  it("treats a non-positive duration as nothing to draw, not an error", () => {
    expect(generateSamples({ duration: 0 })).toEqual([]);
    expect(generateSamples({ duration: -5 })).toEqual([]);
  });

  it("rejects a non-positive sample rate, which is incoherent rather than empty", () => {
    expect(() => generateSamples({ sampleRate: 0 })).toThrow(RangeError);
    expect(() => generateSamples({ sampleRate: -10 })).toThrow(RangeError);
  });
});

describe("rms", () => {
  it("gives a sine peak divided by the square root of 2", () => {
    const samples = generateSamples({
      type: "sine",
      amplitude: 1,
      frequency: 1,
      duration: 1,
      sampleRate: 100000,
    });
    expect(rms(samples)).toBeCloseTo(1 / Math.SQRT2, 4);
  });

  it("gives a square wave its own amplitude", () => {
    const samples = generateSamples({
      type: "square",
      amplitude: 3,
      frequency: 1,
      duration: 1,
      sampleRate: 100000,
    });
    expect(rms(samples)).toBeCloseTo(3, 3);
  });

  it("returns 0 for an empty set rather than NaN", () => {
    expect(rms([])).toBe(0);
    expect(rms(null)).toBe(0);
  });
});

describe("voltageRange", () => {
  it("spans offset plus and minus amplitude", () => {
    const samples = generateSamples({
      type: "sine",
      amplitude: 2,
      offset: 1,
      frequency: 1,
      duration: 1,
      sampleRate: 100000,
    });
    const { min, max } = voltageRange(samples);
    expect(max).toBeCloseTo(3, 4);
    expect(min).toBeCloseTo(-1, 4);
  });

  it("returns zeroes for an empty set", () => {
    expect(voltageRange([])).toEqual({ min: 0, max: 0 });
  });
});

describe("isAliased - the Nyquist limit", () => {
  it("passes a signal sampled well above twice its frequency", () => {
    expect(isAliased(60, 1000)).toBe(false);
  });

  it("flags a signal sampled below twice its frequency", () => {
    expect(isAliased(600, 1000)).toBe(true);
  });

  it("flags a signal sampled at exactly twice its frequency, since the theorem needs strictly more", () => {
    expect(isAliased(500, 1000)).toBe(true);
  });

  it("uses the magnitude of a negative frequency", () => {
    expect(isAliased(-600, 1000)).toBe(true);
  });

  it("never flags DC", () => {
    expect(isAliased(0, 1000)).toBe(false);
  });
});

describe("aliasing actually happens, not just gets flagged", () => {
  const duration = 0.5;
  const trace = (frequency, sampleRate) =>
    generateSamples({ type: "sine", amplitude: 1, frequency, duration, sampleRate });

  it("shows the true frequency when properly sampled", () => {
    expect(apparentFrequency(trace(50, 1000), duration)).toBeCloseTo(50, 0);
    expect(apparentFrequency(trace(90, 1000), duration)).toBeCloseTo(90, 0);
  });

  it("shows a ghost at |f - fs| when undersampled", () => {
    // 50 Hz sampled at 60 Hz should appear as |50 - 60| = 10 Hz.
    expect(apparentFrequency(trace(50, 60), duration)).toBeCloseTo(10, 0);
    expect(apparentFrequency(trace(90, 100), duration)).toBeCloseTo(10, 0);
    expect(apparentFrequency(trace(450, 500), duration)).toBeCloseTo(50, 0);
  });
});

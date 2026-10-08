/**
 * theme.js
 * -----------------------------------------------------------------------
 * One source of truth for every colour in EERoom.
 *
 * Two different systems need these values. Tailwind reads this file from
 * tailwind.config.js and turns the names into utility classes. The two
 * places that draw by hand read it directly: WaveformCanvas.jsx paints a
 * 2D canvas and LogicToolPage.jsx draws an SVG board, and both of those
 * need real colour values rather than class names. Keeping one file means
 * a colour is written once instead of twice, so the page and the drawings
 * cannot drift apart.
 *
 * The palette is a cyanotype blueprint: a deep blue ground with pale line
 * work, the way engineering drawings used to be printed. Copper is the
 * accent because copper is what a conductor is actually made of, so an
 * energised wire drawn in copper is carrying meaning rather than just
 * being coloured in.
 * -----------------------------------------------------------------------
 */

export const palette = {
  // Ground and panels, darkest first.
  ground: "#0E2033",
  panel: "#16304A",
  raised: "#1D3C5A",

  // Drafting line work. grid is the background ruling, rule is a border,
  // ruleStrong is a border that needs to be noticed.
  grid: "#22415E",
  rule: "#2C4A66",
  ruleStrong: "#3E6287",

  // Text, strongest first.
  ink: "#E8EEF4",
  inkMuted: "#9DB4C8",
  inkFaint: "#6E8AA3",

  // Copper. Used for anything interactive and for an energised signal.
  copper: "#C87941",
  copperBright: "#E09A5B",
  copperDim: "#7A4D2B",

  // Traces drawn on the waveform canvas.
  traceTrue: "#6FB3D9", // the real continuous signal
  traceSampled: "#E8EEF4", // what the sample points reconstruct
  traceAliased: "#E0605A", // reconstruction that is lying to you

  // Status. warning is for a circuit that is unfinished but still runs,
  // danger is for something actually wrong, ok is for a passing state.
  warning: "#E3B341",
  warningSurface: "#3A3118",
  danger: "#E0605A",
  dangerSurface: "#3B1F1F",
  ok: "#5FB98B",
};

export default palette;

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

  // Plot surface. Anything that draws a measurement (the waveform canvas,
  // the figure on the landing page) sits on this rather than on the page
  // ground, so a plot reads as a screen set into the drawing rather than
  // a transparent hole in it. It is darker than the page on purpose: the
  // trace needs to be the brightest thing inside the frame.
  display: "#0A1A2B",
  displayGrid: "#1C3A57",

  // Drafting line work. grid is the background ruling, rule is a border,
  // ruleStrong is a border that needs to be noticed.
  grid: "#22415E",
  rule: "#2C4A66",
  ruleStrong: "#3E6287",

  // Text, strongest first.
  //
  // Iteration 3 contrast pass (BL-18): every text colour below now meets
  // the WCAG 2.2 AA minimum of 4.5:1 against the panel background it sits
  // on. inkFaint was #6E8AA3 (3.75:1 on panel), copper #C87941 (4.03:1)
  // and danger #E0605A (3.85:1); each was lightened just enough to pass.
  // Source: WCAG 2.2 Success Criterion 1.4.3, Contrast (Minimum) -
  // https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
  ink: "#E8EEF4", // 11.6:1 on panel
  inkMuted: "#9DB4C8", // 6.3:1 on panel
  inkFaint: "#8AA3BA", // 5.2:1 on panel

  // Copper. Used for anything interactive and for an energised signal.
  copper: "#DE9058", // 5.3:1 as text on panel; dark button text on it is 6.5:1
  copperBright: "#EBA86E",
  copperDim: "#7A4D2B",

  // Traces drawn on the waveform canvas.
  traceTrue: "#6FB3D9", // the real continuous signal
  traceSampled: "#E8EEF4", // what the sample points reconstruct
  traceAliased: "#E0605A", // reconstruction that is lying to you

  // Status. warning is for a circuit that is unfinished but still runs,
  // danger is for something actually wrong, ok is for a passing state.
  warning: "#E3B341",
  warningSurface: "#3A3118",
  danger: "#F2847D", // 5.4:1 on panel, 6.0:1 on dangerSurface
  dangerSurface: "#3B1F1F",
  ok: "#5FB98B",
};

export default palette;

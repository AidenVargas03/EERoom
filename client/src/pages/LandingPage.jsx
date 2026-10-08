/**
 * pages/LandingPage.jsx
 * -----------------------------------------------------------------------
 * The public front page. Two jobs: say what EERoom is, and get a visitor
 * to an account.
 *
 * The drawing at the top is not decoration. It is a correct aliasing
 * demonstration, which is the most interesting thing the waveform tool
 * does. A 3-cycle signal sampled five times across the same span gives
 * samples that a 1-cycle wave fits exactly, so the reconstruction is
 * wrong in a way that looks completely reasonable. Working it out here
 * rather than drawing a decorative squiggle means the picture is telling
 * the truth about the maths.
 *
 * The sample values are sin(2*pi*3*t) at t = 0, 0.25, 0.5, 0.75, 1, which
 * come out as 0, -1, 0, +1, 0. The curve -sin(2*pi*t) passes through all
 * five, which is the alias. This mirrors the |f - fs| relationship that
 * utils/waveform.js implements and that the unit tests check.
 * -----------------------------------------------------------------------
 */

import { Link } from "react-router-dom";
import palette from "../theme.js";

/** Sample a function across the view box and return an SVG path. */
function wavePath(cyclesPerSpan, { width, mid, amp, steps = 240, invert = false }) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const y = Math.sin(2 * Math.PI * cyclesPerSpan * t) * (invert ? -1 : 1);
    points.push(`${(t * width).toFixed(2)},${(mid - y * amp).toFixed(2)}`);
  }
  return `M ${points.join(" L ")}`;
}

function AliasingFigure() {
  const width = 520;
  const height = 240;
  const mid = height / 2;
  const amp = 76;

  const trueWave = wavePath(3, { width, mid, amp });
  const aliasWave = wavePath(1, { width, mid, amp, invert: true });

  // Five sample instants across the span, which is too few for a 3-cycle
  // signal and is exactly why the alias appears.
  const samples = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    x: t * width,
    y: mid - Math.sin(2 * Math.PI * 3 * t) * amp,
  }));

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto rounded border border-rule bg-panel/60"
        role="img"
        aria-label="A three cycle wave sampled five times. The samples also fit a one cycle wave, which is the alias."
      >
        <g stroke={palette.grid} strokeWidth="1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line key={`v${i}`} x1={(i * width) / 7} y1="0" x2={(i * width) / 7} y2={height} />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`h${i}`} x1="0" y1={(i * height) / 4} x2={width} y2={(i * height) / 4} />
          ))}
        </g>

        <line x1="0" y1={mid} x2={width} y2={mid} stroke={palette.ruleStrong} strokeWidth="1" />

        <path d={trueWave} fill="none" stroke={palette.traceTrue} strokeWidth="2" />
        <path
          d={aliasWave}
          fill="none"
          stroke={palette.traceAliased}
          strokeWidth="2"
          strokeDasharray="7 5"
        />

        {samples.map((s, i) => (
          <g key={i}>
            <line
              x1={s.x}
              y1={mid}
              x2={s.x}
              y2={s.y}
              stroke={palette.copperDim}
              strokeWidth="1.5"
            />
            <circle cx={s.x} cy={s.y} r="5" fill={palette.copper} />
          </g>
        ))}
      </svg>

      <figcaption className="mt-4 text-sm leading-relaxed text-ink-muted">
        <span style={{ color: palette.traceTrue }}>The real signal</span> runs at three cycles.
        Take <span style={{ color: palette.copper }}>five samples</span> across it and those
        samples also fit{" "}
        <span style={{ color: palette.traceAliased }}>a one cycle wave</span>, which is what you
        would measure. Sample too slowly and the answer is confidently wrong. The waveform tool
        lets you move the sample rate and watch the moment it breaks.
      </figcaption>
    </figure>
  );
}

/** Small schematic marks. Line work only, so they match the drawings. */
const glyphs = {
  resistor: (
    <path
      d="M2 12 H9 l3 -7 l5 14 l5 -14 l5 14 l3 -7 H38"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  wave: (
    <path
      d="M2 12 C7 2, 12 2, 17 12 S27 22, 32 12 S38 4, 38 12"
      fill="none"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  ),
  gate: (
    <g fill="none" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M4 5 H20 a7 7 0 0 1 0 14 H4 Z" />
      <line x1="0" y1="9" x2="4" y2="9" />
      <line x1="0" y1="15" x2="4" y2="15" />
      <line x1="27" y1="12" x2="38" y2="12" />
    </g>
  ),
};

function Tool({ glyph, name, children }) {
  return (
    <div className="flex gap-5 py-7 border-t border-rule">
      <svg
        viewBox="0 0 40 24"
        className="w-10 h-6 shrink-0 self-start mt-1 text-copper"
        stroke="currentColor"
        aria-hidden="true"
      >
        {glyphs[glyph]}
      </svg>
      <div>
        <h3 className="text-ink font-medium mb-1">{name}</h3>
        <p className="text-ink-muted text-sm leading-relaxed max-w-prose">{children}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-rule bg-ground/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <span className="font-semibold tracking-tight text-ink">EERoom</span>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/login" className="text-ink-muted hover:text-ink transition-colors">
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded border border-copper px-3 py-1.5 text-copper hover:bg-copper hover:text-ground transition-colors"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight text-ink">
              Electrical engineering tools that run in a browser.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-muted max-w-prose">
              Three simulation tools for coursework, built for students who do not have a MATLAB
              or Ansys licence. Nothing to install. Save your work and share it with a link.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded bg-copper px-5 py-2.5 font-medium text-ground hover:bg-copper-bright transition-colors"
              >
                Create account
              </Link>
              <Link
                to="/login"
                className="rounded border border-rule-strong px-5 py-2.5 text-ink hover:border-copper hover:text-copper transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>

          <AliasingFigure />
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-24">
          <h2 className="text-sm font-medium text-ink-faint mb-2">What is in it</h2>
          <Tool glyph="resistor" name="Ohm's law and power">
            Enter any two of voltage, current and resistance. The third value and the power follow
            as you type.
          </Tool>
          <Tool glyph="wave" name="Waveform visualiser">
            Sine, square, triangle and sawtooth, with adjustable frequency, amplitude and sample
            rate. Shows RMS and warns you when the sample rate drops below Nyquist.
          </Tool>
          <Tool glyph="gate" name="Logic gate sandbox">
            Place gates on a board and wire them together. The truth table and the boolean
            expression update as you build, and unconnected pins are flagged rather than silently
            read as zero.
          </Tool>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-ink-faint">
          EERoom. Built for electrical engineering coursework.
        </div>
      </footer>
    </div>
  );
}

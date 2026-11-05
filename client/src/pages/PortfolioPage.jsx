/**
 * pages/PortfolioPage.jsx
 * -----------------------------------------------------------------------
 * Public Senior Project Portfolio at /portfolio (Milestone 6).
 *
 * The assignment asks for an internet-facing portfolio with an overview of
 * the project, design diagrams, code snippets, supporting artifacts, the
 * background and approach to implementation, and how to run or access the
 * project. Each of those has its own section below, reachable from the
 * sticky navigation.
 *
 * It lives inside EERoom so it deploys with the site and a reader can go
 * from reading about a tool to using it in one click. Everything is
 * static: screenshots and diagrams are in /public/media/portfolio, the
 * documents are PDFs in /public/docs, and the code excerpts are in
 * data/portfolioSnippets.js. No API calls and no login.
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { SNIPPETS } from "../data/portfolioSnippets.js";

const REPO_URL = "https://github.com/AidenVargas03/EERoom";
const MEDIA = "/media/portfolio";

const NAV = [
  ["overview", "Overview"],
  ["approach", "Approach"],
  ["diagrams", "Diagrams"],
  ["code", "Code"],
  ["testing", "Testing"],
  ["run", "Run it"],
  ["documents", "Documents"],
];

const TOOLS = [
  { name: "Logic Gate Sandbox", to: "/tools/logic", img: "logic.webp", text: "Wire seven gate types on a grid and watch the truth table and Boolean expression build as you go.", alt: "Half adder built from XOR and AND gates with its truth table" },
  { name: "Waveform Visualizer", to: "/tools/wave", img: "wave.webp", text: "Four signal shapes with a sample rate control that shows aliasing happen in real time.", alt: "50 Hz sine sampled at 80 Hz with the aliased trace and a warning" },
  { name: "Ohm's Law Calculator", to: "/tools/ohm", img: "ohm.webp", text: "Enter any two of V, I, and R. The third value and the power update as you type.", alt: "Ohm's Law calculator showing 12 V, 2 A, 6 ohms, and 24 W" },
];

const STATS = [
  ["3", "simulation tools"],
  ["119", "automated tests, all passing"],
  ["27", "manual tests on the live site"],
  ["20", "backlog items tracked"],
];

const STAGES = [
  ["Proposal", "CST-451"],
  ["Requirements", "CST-451"],
  ["Architecture", "CST-451"],
  ["Iteration 1", "Auth, Ohm's Law"],
  ["Iteration 2", "Tools, sharing, deploy"],
  ["Iteration 3", "Reset, guests, tests"],
  ["Release", "Docs, portfolio"],
];

const DIAGRAMS = [
  { id: "architecture", tab: "System", file: "diagram-architecture.webp", caption: "System architecture: the React client, the Express REST API, and Supabase." },
  { id: "deployment", tab: "Deployment", file: "diagram-deployment.webp", caption: "Every push to GitHub deploys the client to Vercel and the API to Railway." },
  { id: "erd", tab: "Database", file: "diagram-erd.webp", caption: "One user owns many projects. Each project stores its tool's state as JSON." },
  { id: "modules", tab: "Modules", file: "diagram-modules.webp", caption: "Client and server modules and how they depend on each other." },
  { id: "login", tab: "Login flow", file: "diagram-seq-login.webp", caption: "Login, including saving a guest's pending work." },
  { id: "save", tab: "Save flow", file: "diagram-seq-save.webp", caption: "Create on the first save, update after that, always filtered by owner." },
  { id: "reset", tab: "Reset flow", file: "diagram-seq-reset.webp", caption: "Password reset with a one-time link checked by Supabase." },
  { id: "share", tab: "Share flow", file: "diagram-seq-share.webp", caption: "Creating a share link and viewing it without an account." },
];

const DOCS = [
  ["Project Proposal", "Final revision: goals, scope, risks, and outcomes", "EERoom-Project-Proposal.pdf", 15],
  ["Requirements Specification", "All 39 requirements with their final status", "EERoom-Requirements-Specification.pdf", 10],
  ["Architecture Plan", "Diagrams, schema, API, security, and screens", "EERoom-Architecture-Plan.pdf", 26],
  ["Coding and Testing: Iteration 2", "Implementation plan, traceability, and test cases", "EERoom-Coding-and-Testing-Iteration-2.pdf", 35],
  ["Coding and Testing: Iteration 3", "API test suite, regression run, and results", "EERoom-Coding-and-Testing-Iteration-3.pdf", 45],
  ["Final Presentation", "The slides from the final presentation", "EERoom-Final-Presentation.pdf", 14],
  ["Showcase Poster", "Technology Capstone Showcase poster", "EERoom-Showcase-Poster.pdf", 1],
];

/** A section with an anchor id, a small label, and a heading. */
function Section({ id, label, title, children, intro }) {
  return (
    <section id={id} className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-copper">{label}</p>
      <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-ink">{title}</h2>
      {intro && <p className="mt-3 max-w-2xl text-lg text-ink-muted">{intro}</p>}
      <div className="mt-10">{children}</div>
    </section>
  );
}

/** A row of buttons that picks one item from a list (used for diagrams and code). */
function Tabs({ items, active, onPick, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          onClick={() => onPick(item.id)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active === item.id
              ? "bg-copper text-ground"
              : "border border-rule-strong text-ink-muted hover:border-copper hover:text-ink"
          }`}
        >
          {item.tab}
        </button>
      ))}
    </div>
  );
}

/** Small document icon for the documents grid. */
function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-copper" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M6 2h8l4 4v16H6z" strokeLinejoin="round" />
      <path d="M14 2v4h4M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

export default function PortfolioPage() {
  const [diagram, setDiagram] = useState(DIAGRAMS[0].id);
  const [snippet, setSnippet] = useState(SNIPPETS[0].id);
  const shownDiagram = DIAGRAMS.find((d) => d.id === diagram);
  const shownSnippet = SNIPPETS.find((s) => s.id === snippet);

  return (
    <div className="min-h-screen bg-ground">
      {/* Sticky navigation */}
      <header className="sticky top-0 z-20 border-b border-rule bg-ground/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
          <a href="#top" className="font-semibold tracking-tight text-ink shrink-0">
            EERoom <span className="text-ink-faint font-normal">· Portfolio</span>
          </a>
          <nav aria-label="Portfolio sections" className="hidden lg:flex items-center gap-5 text-sm">
            {NAV.map(([id, name]) => (
              <a key={id} href={`#${id}`} className="text-ink-muted hover:text-ink transition-colors">
                {name}
              </a>
            ))}
          </nav>
          <Link
            to="/"
            className="shrink-0 rounded border border-copper px-3 py-1.5 text-sm text-copper hover:bg-copper hover:text-ground transition-colors"
          >
            Open the app
          </Link>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-copper">
              Senior Capstone Portfolio · Aiden Vargas
            </p>
            <h1 className="mt-4 text-5xl sm:text-6xl font-semibold tracking-tight text-ink">EERoom</h1>
            <p className="mt-5 text-xl leading-relaxed text-ink-muted max-w-xl">
              Free electrical engineering simulations that run in any browser. Built, tested, and
              deployed for CST-451 and CST-452 at Grand Canyon University.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://www.eeroom.io"
                className="rounded bg-copper px-5 py-3 font-semibold text-ground hover:bg-copper-bright transition-colors"
              >
                Try the live app
              </a>
              <a
                href={REPO_URL}
                className="rounded border border-rule-strong px-5 py-3 text-ink hover:border-copper hover:text-copper transition-colors"
              >
                Source on GitHub
              </a>
              <a href="#documents" className="rounded px-5 py-3 text-copper hover:underline">
                Project documents
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={`${MEDIA}/wave.webp`}
              alt="Waveform Visualizer showing a 50 Hz sine sampled at 80 Hz and the aliased wave it produces"
              className="w-full rounded-xl border border-rule-strong shadow-2xl"
            />
            <img
              src={`${MEDIA}/logic.webp`}
              alt="Logic Gate Sandbox with a half adder"
              className="hidden sm:block absolute -bottom-10 -left-8 w-1/2 rounded-xl border border-rule-strong shadow-2xl"
            />
          </div>
        </section>

        {/* Stats */}
        <section aria-label="Project at a glance" className="mx-auto max-w-6xl px-6 pt-10 pb-4">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(([n, label]) => (
              <div key={label} className="rounded-xl border border-rule bg-panel p-6">
                <dt className="sr-only">{label}</dt>
                <dd className="text-4xl font-semibold font-mono text-copper">{n}</dd>
                <dd className="mt-1 text-sm text-ink-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Overview */}
        <Section
          id="overview"
          label="Overview"
          title="Three tools, one platform"
          intro="Use every tool as a guest. A free account adds saving, a dashboard, password reset, and read-only share links."
        >
          <div className="grid gap-6 md:grid-cols-3">
            {TOOLS.map((t) => (
              <article key={t.name} className="flex flex-col rounded-xl border border-rule bg-panel overflow-hidden">
                <div className="h-52 overflow-hidden border-b border-rule bg-display">
                  <img src={`${MEDIA}/${t.img}`} alt={t.alt} loading="lazy" className="h-full w-full object-cover object-top" />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-lg font-semibold text-ink">{t.name}</h3>
                  <p className="mt-2 flex-1 text-ink-muted">{t.text}</p>
                  <Link to={t.to} className="mt-4 font-medium text-copper hover:underline">
                    Try it, no account needed &rarr;
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </Section>

        {/* Background and approach */}
        <Section id="approach" label="Background and approach" title="Why it exists and how it was built">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-rule bg-panel p-6">
              <h3 className="font-semibold text-ink">The problem</h3>
              <p className="mt-2 text-ink-muted">
                Engineering fundamentals are taught as equations, and the professional tools that
                let students experiment are licensed, installed on lab computers, and slow to learn.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-panel p-6">
              <h3 className="font-semibold text-ink">The approach</h3>
              <p className="mt-2 text-ink-muted">
                A React app with all the math in the browser, an Express API for accounts and saved
                projects, and Supabase for the database and login. Built in three iterations with a
                Kanban backlog and a scope review after each one.
              </p>
            </div>
          </div>

          <ol className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {STAGES.map(([name, note], i) => (
              <li key={name} className="rounded-xl border border-rule bg-panel p-4">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    i < 3 ? "bg-raised text-ink" : "bg-copper text-ground"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="mt-3 font-semibold text-ink">{name}</div>
                <div className="text-sm text-ink-faint">{note}</div>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-rule bg-panel p-6">
              <h3 className="font-semibold text-ink">What was cut, and why</h3>
              <ul className="mt-3 space-y-2 text-ink-muted">
                <li><span className="text-ink">Circuit simulator:</span> highest risk, could not be finished and tested in time.</li>
                <li><span className="text-ink">Google sign-in:</span> email login already met the need.</li>
                <li><span className="text-ink">Paid Pro tier:</span> payment risk with no learning value.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-rule bg-panel p-6">
              <h3 className="font-semibold text-ink">What I learned</h3>
              <ul className="mt-3 space-y-2 text-ink-muted">
                <li>Cutting scope early beats shipping a half-working product.</li>
                <li>Deploy early: CORS, proxies, and email links only break on real hosts.</li>
                <li>Pure functions and a split Express app make testing easy.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Design diagrams */}
        <Section id="diagrams" label="Design" title="Design diagrams" intro="From the final Architecture Plan.">
          <Tabs items={DIAGRAMS} active={diagram} onPick={setDiagram} label="Diagrams" />
          <figure className="mt-6 rounded-xl border border-rule bg-white p-4 sm:p-8">
            <a href={`${MEDIA}/${shownDiagram.file}`} target="_blank" rel="noreferrer" title="Open full size">
              <img
                src={`${MEDIA}/${shownDiagram.file}`}
                alt={shownDiagram.caption}
                className="mx-auto max-h-[640px] w-auto max-w-full"
              />
            </a>
          </figure>
          <p className="mt-3 text-sm text-ink-muted">
            {shownDiagram.caption}{" "}
            <a href={`${MEDIA}/${shownDiagram.file}`} target="_blank" rel="noreferrer" className="text-copper hover:underline">
              Open full size
            </a>
          </p>
        </Section>

        {/* Code snippets */}
        <Section id="code" label="Code" title="Code highlights" intro="Real excerpts from the repository.">
          <Tabs items={SNIPPETS} active={snippet} onPick={setSnippet} label="Code snippets" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <h3 className="text-xl font-semibold text-ink">{shownSnippet.title}</h3>
              <p className="mt-3 text-ink-muted leading-relaxed">{shownSnippet.why}</p>
              <a
                href={`${REPO_URL}/blob/main/${shownSnippet.file}`}
                className="mt-4 inline-block font-mono text-sm text-copper hover:underline break-all"
              >
                {shownSnippet.file}
              </a>
            </div>
            <pre className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-rule bg-display p-5 text-sm leading-relaxed text-ink">
              <code className="font-mono">{shownSnippet.code}</code>
            </pre>
          </div>
        </Section>

        {/* Testing */}
        <Section id="testing" label="Testing" title="Tested before every release">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["82", "unit tests", "Logic evaluator, waveform math, reset links, guest drafts (Vitest)"],
              ["37", "API tests", "Real HTTP requests through Express, with only the database replaced (Supertest)"],
              ["27", "manual tests", "Every feature run end to end on the live site, all passing"],
            ].map(([n, label, text]) => (
              <div key={label} className="rounded-xl border border-rule bg-panel p-6">
                <div className="text-4xl font-semibold font-mono text-copper">{n}</div>
                <div className="mt-1 font-semibold text-ink">{label}</div>
                <p className="mt-2 text-sm text-ink-muted">{text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* How to run or access */}
        <Section id="run" label="Run it" title="How to access or run EERoom">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 rounded-xl border border-rule bg-panel p-6">
              <h3 className="text-lg font-semibold text-ink">Use it online</h3>
              <ol className="mt-4 space-y-3 text-ink-muted list-decimal pl-5">
                <li>
                  Go to{" "}
                  <a href="https://www.eeroom.io" className="text-copper hover:underline">www.eeroom.io</a>{" "}
                  in any modern browser.
                </li>
                <li>Pick a tool. No account or install is needed.</li>
                <li>To save, click Sign up to save and create a free account.</li>
                <li>Saved projects appear on your dashboard; use Share to send a read-only link.</li>
              </ol>
            </div>
            <div className="min-w-0 rounded-xl border border-rule bg-panel p-6">
              <h3 className="text-lg font-semibold text-ink">Run it locally</h3>
              <p className="mt-2 text-sm text-ink-muted">
                Needs Node.js 18+ and a free Supabase project. Full steps are in the{" "}
                <a href={`${REPO_URL}#running-it-locally`} className="text-copper hover:underline">README</a>.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-rule bg-display p-4 text-sm leading-relaxed text-ink">
                <code className="font-mono">{`git clone ${REPO_URL}.git
cd EERoom/server
cp .env.example .env   # add Supabase keys
npm install && npm run dev

cd ../client
npm install && npm run dev
# open http://localhost:5173

npm test   # in client or server`}</code>
              </pre>
            </div>
          </div>
        </Section>

        {/* Documents */}
        <Section id="documents" label="Artifacts" title="Project documents" intro="The full documentation from CST-451 and CST-452, as PDFs.">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DOCS.map(([title, desc, file, pages]) => (
              <li key={file}>
                <a
                  href={`/docs/${file}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full gap-4 rounded-xl border border-rule bg-panel p-5 hover:border-copper transition-colors"
                >
                  <DocIcon />
                  <div>
                    <div className="font-semibold text-ink">{title}</div>
                    <div className="mt-1 text-sm text-ink-muted">{desc}</div>
                    <div className="mt-2 text-xs text-ink-faint">
                      PDF · {pages} {pages === 1 ? "page" : "pages"}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-faint">
          <span>EERoom by Aiden Vargas · Grand Canyon University · CST-451 and CST-452</span>
          <span className="flex gap-6">
            <a href={REPO_URL} className="hover:text-ink">GitHub</a>
            <a href="https://www.eeroom.io" className="hover:text-ink">www.eeroom.io</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

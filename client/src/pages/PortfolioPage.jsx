/**
 * pages/PortfolioPage.jsx
 * -----------------------------------------------------------------------
 * Public project portfolio at /portfolio (Milestone 6).
 *
 * The CST-452 handbook asks for an internet-facing Project Portfolio that
 * shows potential employers an overview of the project. It lives inside
 * EERoom itself so it deploys with the site, is always in step with the
 * live application, and lets a reader go from reading about a tool to
 * using it in one click.
 *
 * Everything here is static content: no API calls, no login. The three
 * screenshots in /public/portfolio were taken from the running app.
 *
 * Sections, in order: summary, the problem, the three tools, engineering
 * highlights, architecture, process, results, scope decisions, lessons
 * learned, and links.
 * -----------------------------------------------------------------------
 */

import { Link } from "react-router-dom";

const REPO_URL = "https://github.com/AidenVargas03/EERoom";

/** A section with a small label above its heading, matching the landing page. */
function Section({ id, label, title, children }) {
  return (
    <section id={id} className="mx-auto max-w-5xl px-6 py-14 border-t border-rule">
      <p className="text-sm font-medium text-copper mb-2">{label}</p>
      <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink mb-6">{title}</h2>
      {children}
    </section>
  );
}

/** One stat in the results row. */
function Stat({ value, label }) {
  return (
    <div className="rounded-lg border border-rule bg-panel p-5">
      <div className="text-3xl font-semibold text-copper font-mono">{value}</div>
      <div className="mt-1 text-sm text-ink-muted">{label}</div>
    </div>
  );
}

/** A tool with its screenshot and a link to try it. */
function ToolShowcase({ image, alt, name, to, children, narrow = false }) {
  return (
    <div className={`grid gap-8 items-center py-8 ${narrow ? "md:grid-cols-[1fr_minmax(0,320px)]" : "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"}`}>
      <div>
        <h3 className="text-xl font-semibold text-ink mb-3">{name}</h3>
        <div className="text-ink-muted leading-relaxed space-y-3">{children}</div>
        <Link to={to} className="inline-block mt-4 text-copper hover:underline">
          Try it now, no account needed &rarr;
        </Link>
      </div>
      <img
        src={image}
        alt={alt}
        loading="lazy"
        className="w-full rounded-lg border border-rule"
      />
    </div>
  );
}

/** One box in the architecture diagram. */
function ArchBox({ title, host, items }) {
  return (
    <div className="rounded-lg border border-rule-strong bg-panel p-5 flex-1 min-w-0">
      <div className="text-ink font-semibold">{title}</div>
      <div className="text-xs text-copper mb-3">{host}</div>
      <ul className="text-sm text-ink-muted space-y-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** The arrow between architecture boxes; turns downward on narrow screens. */
function ArchArrow({ label }) {
  return (
    <div className="flex md:flex-col items-center justify-center gap-2 text-xs text-ink-faint py-2 md:py-0 md:px-2 shrink-0">
      <span aria-hidden="true" className="text-copper text-xl leading-none">
        <span className="hidden md:inline">&rarr;</span>
        <span className="md:hidden">&darr;</span>
      </span>
      <span>{label}</span>
    </div>
  );
}

const PROCESS = [
  ["Proposal", "CST-451", "Defined the problem, the audience, and a focused MVP."],
  ["Requirements", "CST-451", "39 functional requirements and the user stories behind them."],
  ["Architecture", "CST-451", "Logical architecture, database design, UI screens, and a security design."],
  ["Iteration 1", "CST-451", "Project scaffolding, authentication, and the Ohm's Law calculator."],
  ["Iteration 2", "CST-452, Milestone 4", "Waveform and logic tools, dashboard, sharing, deployment, and a scope review."],
  ["Iteration 3", "CST-452, Milestone 5", "Password reset, guest access, tablet layout, and the API test suite."],
  ["Release", "CST-452, Milestone 6", "Final documentation, this portfolio, and the presentation."],
];

const STACK = [
  "React 18", "React Router 6", "Vite 5", "Tailwind CSS 3", "Node.js", "Express 4",
  "PostgreSQL", "Supabase Auth", "JWT", "Vitest", "Supertest", "Vercel", "Railway", "Git and GitHub",
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-rule bg-ground/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight text-ink">
            EERoom
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href={REPO_URL} className="text-ink-muted hover:text-ink transition-colors">
              Source code
            </a>
            <Link
              to="/"
              className="rounded border border-copper px-3 py-1.5 text-copper hover:bg-copper hover:text-ground transition-colors"
            >
              Open the app
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Summary */}
        <section className="mx-auto max-w-5xl px-6 pt-16 pb-14">
          <p className="text-sm font-medium text-copper mb-3">Capstone project portfolio</p>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight text-ink">
            EERoom: electrical engineering simulations in the browser
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-muted max-w-prose">
            A free web platform with three interactive tools for electrical engineering coursework:
            an Ohm&apos;s Law calculator, a waveform visualizer that shows aliasing as it happens,
            and a logic gate sandbox that builds the truth table as you wire. Designed, built,
            tested, and deployed by Aiden Vargas as the senior capstone for CST-451 and CST-452 at
            Grand Canyon University, College of Engineering and Technology.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://www.eeroom.io"
              className="rounded bg-copper px-5 py-2.5 font-medium text-ground hover:bg-copper-bright transition-colors"
            >
              Live site: www.eeroom.io
            </a>
            <a
              href={REPO_URL}
              className="rounded border border-rule-strong px-5 py-2.5 text-ink hover:border-copper hover:text-copper transition-colors"
            >
              View the code on GitHub
            </a>
          </div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-ink-faint">Role</dt>
              <dd className="text-ink">Sole developer: design, code, testing, deployment</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Stack</dt>
              <dd className="text-ink">React, Node.js and Express, PostgreSQL</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Hosting</dt>
              <dd className="text-ink">Vercel, Railway, and Supabase</dd>
            </div>
          </dl>
        </section>

        <Section id="problem" label="The problem" title="Engineering concepts are easier to learn when you can see them">
          <div className="grid gap-6 md:grid-cols-2 text-ink-muted leading-relaxed">
            <p>
              Ohm&apos;s Law, sampling, and Boolean logic are taught mostly as equations. Students
              learn them faster when they can change a value and watch what happens, but most
              simulation software is installed on lab computers, costs money, or takes a long time
              to learn.
            </p>
            <p>
              EERoom opens in any browser with nothing to install. Visitors can use every tool
              without an account. Creating a free account lets them save their work, reopen it from
              a dashboard, and share a read-only link with a classmate or instructor.
            </p>
          </div>
        </Section>

        <Section id="tools" label="What it does" title="Three tools">
          <ToolShowcase
            image="/portfolio/logic.webp"
            alt="Logic Gate Sandbox showing a half adder: inputs A and B wired to XOR and AND gates, with outputs Y and Z, the expressions Y = (A XOR B) and Z = (A AND B), and a four-row truth table."
            name="Logic Gate Sandbox"
            to="/tools/logic"
          >
            <p>
              Place inputs, seven gate types, and outputs on a grid, then wire them by clicking or
              dragging between pins. The truth table and a Boolean expression for each output
              update as you build.
            </p>
            <p>
              The evaluator refuses circuits with feedback loops instead of guessing an answer, and
              it points out any pin that has been left unconnected.
            </p>
          </ToolShowcase>
          <ToolShowcase
            image="/portfolio/wave.webp"
            alt="Waveform Visualizer showing a 50 Hz sine wave sampled at 80 Hz, with the sampled trace drawing a slower false wave and a warning that the signal is aliased."
            name="Waveform Visualizer"
            to="/tools/wave"
          >
            <p>
              Draw sine, square, sawtooth, and triangle signals with adjustable amplitude,
              frequency, phase, and DC offset, and read off the RMS, peak-to-peak, and period.
            </p>
            <p>
              Choose a sample rate and the tool overlays what that rate would actually record. Drop
              below twice the signal frequency and it shows the false, slower wave that aliasing
              produces, with a warning that explains why.
            </p>
          </ToolShowcase>
          <ToolShowcase
            image="/portfolio/ohm.webp"
            alt="Ohm's Law calculator with 12 volts and 2 amps entered, showing 6 ohms and 24 watts, and the guest prompt to sign up or log in to save."
            name="Ohm's Law and Power Calculator"
            to="/tools/ohm"
            narrow
          >
            <p>
              Enter any two of voltage, current, and resistance. The third value and the power are
              calculated as you type, with guards against division by zero.
            </p>
            <p>
              As in every tool, a guest who decides to save is asked to sign up, and the work on
              screen is saved to the new account as soon as they log in.
            </p>
          </ToolShowcase>
        </Section>

        <Section id="highlights" label="Engineering highlights" title="Details that matter">
          <ul className="grid gap-6 md:grid-cols-2">
            {[
              ["Correct by construction", "The calculation engines are pure functions kept apart from the interface, so the aliasing math and the gate evaluator are tested directly against hand-worked answers."],
              ["Ownership on every query", "Every project query on the server is filtered by the user ID from the verified token. A user ID sent in a request body is ignored, so no one can read, edit, delete, or share another person's work."],
              ["A reset that gives nothing away", "The password reset form answers the same way for every email, so it cannot be used to discover who has an account. Reset links work once, are checked with Supabase before anything changes, and are cleared from the address bar."],
              ["Limits on public routes", "The login, registration, and reset routes allow 10 requests per 15 minutes per address, which stops password guessing without getting in the way of a real user."],
              ["Nothing lost when a guest signs up", "A guest's unsaved work is held in session storage while they register and log in, then saved to the new account and reopened, exactly once."],
              ["Accessible on tablets", "Every page works at 768 pixels wide, text meets the WCAG 2.2 AA contrast ratio, and the logic board scales to fit while keeping its pin targets at least 24 pixels across."],
            ].map(([title, body]) => (
              <li key={title} className="rounded-lg border border-rule bg-panel p-5">
                <h3 className="text-ink font-semibold mb-2">{title}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="architecture" label="Architecture" title="Three tiers, three hosts">
          <div className="flex flex-col md:flex-row md:items-stretch">
            <ArchBox
              title="React client"
              host="Vercel, www.eeroom.io"
              items={["Three tool pages and the dashboard", "Logic and waveform engines", "Share and guest-save flows"]}
            />
            <ArchArrow label="HTTPS with a JWT" />
            <ArchBox
              title="Express REST API"
              host="Railway"
              items={["Auth, projects, and share routes", "JWT check and rate limiting", "Ownership filter on every query"]}
            />
            <ArchArrow label="SQL and Auth API" />
            <ArchBox
              title="Supabase"
              host="PostgreSQL and Auth"
              items={["Users and projects tables", "Bcrypt password hashing", "Password recovery email"]}
            />
          </div>
          <p className="mt-6 text-ink-muted leading-relaxed max-w-prose">
            Each tool saves its state as JSON in one projects table, so adding a tool needs no
            database change. Pushing to GitHub deploys the client and the API automatically.
          </p>
        </Section>

        <Section id="process" label="Process" title="From proposal to release in seven stages">
          <ol className="relative border-l border-rule-strong ml-3 space-y-6">
            {PROCESS.map(([stage, when, what], i) => (
              <li key={stage} className="pl-8 relative">
                <span className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-copper text-xs font-semibold text-ground">
                  {i + 1}
                </span>
                <div className="text-ink font-semibold">
                  {stage} <span className="text-sm font-normal text-ink-faint">· {when}</span>
                </div>
                <p className="text-sm text-ink-muted">{what}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-ink-muted leading-relaxed max-w-prose">
            Work was tracked on a Kanban backlog of 20 items with estimates and actual hours, and
            every requirement was mapped to the code that implements it and the test that checks
            it.
          </p>
        </Section>

        <Section id="results" label="Results" title="Tested and live">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value="119" label="automated tests, all passing" />
            <Stat value="82" label="unit tests for the engines and helpers" />
            <Stat value="37" label="API tests through the real Express app" />
            <Stat value="27" label="manual test cases run on the live site" />
          </div>
          <p className="mt-6 text-ink-muted leading-relaxed max-w-prose">
            The API tests send real HTTP requests through the routes, middleware, and controllers,
            with only the database replaced. To prove they catch real defects, the ownership check
            was removed on purpose, a test failed, and the check was put back.
          </p>
        </Section>

        <Section id="scope" label="Scope decisions" title="What was cut, and why">
          <div className="text-ink-muted leading-relaxed space-y-4 max-w-prose">
            <p>
              The original plan also included a DC circuit simulator, Google sign-in, and paid Pro
              accounts through Stripe. After the first code iteration it was clear that one
              developer could not build and properly test all of it in the time left.
            </p>
            <p>
              The circuit simulator was the riskiest feature, and payments added security risk
              without helping students learn, so both were removed, along with Google sign-in,
              which email login already covered. That left time to finish, test, and deploy the
              three tools well, and to add guest access and accessibility work that were not in the
              original plan.
            </p>
          </div>
        </Section>

        <Section id="lessons" label="Lessons learned" title="What I would carry into the next project">
          <ul className="grid gap-4 md:grid-cols-2 text-ink-muted leading-relaxed">
            <li className="rounded-lg border border-rule bg-panel p-5">
              <span className="text-ink font-semibold">Cut scope early, on purpose.</span> A smaller
              product that is finished and tested beats a larger one that is half working.
            </li>
            <li className="rounded-lg border border-rule bg-panel p-5">
              <span className="text-ink font-semibold">Deploy early.</span> CORS, environment
              variables, and email redirects only show their problems on a real host.
            </li>
            <li className="rounded-lg border border-rule bg-panel p-5">
              <span className="text-ink font-semibold">Design for testing.</span> Keeping the math
              in pure functions and splitting the Express app from the server start made both easy
              to test.
            </li>
            <li className="rounded-lg border border-rule bg-panel p-5">
              <span className="text-ink font-semibold">Security is in the details.</span> Same
              answers for unknown emails, ownership filters, and rate limits are small pieces of code
              that close real holes.
            </li>
          </ul>
        </Section>

        <Section id="stack" label="Technology" title="Built with">
          <ul className="flex flex-wrap gap-2">
            {STACK.map((tech) => (
              <li key={tech} className="rounded-full border border-rule-strong px-3 py-1 text-sm text-ink-muted">
                {tech}
              </li>
            ))}
          </ul>
        </Section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-ink-faint flex flex-wrap gap-x-6 gap-y-2 justify-between">
          <span>EERoom by Aiden Vargas. Grand Canyon University capstone, CST-451 and CST-452.</span>
          <span className="flex gap-6">
            <a href={REPO_URL} className="hover:text-ink">GitHub</a>
            <Link to="/" className="hover:text-ink">Open the app</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

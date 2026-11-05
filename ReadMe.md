# EERoom

Free browser-based electrical engineering simulation tools: an Ohm's Law and
power calculator, a waveform visualizer that demonstrates aliasing, and a logic
gate sandbox that builds the truth table as you wire.

CST-451 and CST-452 Senior Capstone, Grand Canyon University, College of
Engineering and Technology. Developer: Aiden Vargas. Instructor: Professor
Thompson.

| | |
|---|---|
| **Live application** | https://www.eeroom.io |
| **Project portfolio** | https://www.eeroom.io/portfolio |
| **Git repository** | https://github.com/AidenVargas03/EERoom |
| **API** | https://eeroom-production.up.railway.app (health check: `/health`) |

The repository is public so that the instructor, the mentor, and potential
employers can read the code and its history without needing an invitation.

## Features

- **Ohm's Law and Power Calculator.** Enter any two of voltage, current, and
  resistance; the third value and the power are calculated as you type, with
  guards against division by zero.
- **Waveform Visualizer.** Sine, square, sawtooth, and triangle signals with
  amplitude, frequency, phase, and DC offset controls, RMS and peak-to-peak
  readouts, and a sample rate control that overlays what that rate would record
  and warns when the signal is aliased (below the Nyquist rate).
- **Logic Gate Sandbox.** Seven gate types (AND, OR, NOT, NAND, NOR, XOR, XNOR)
  placed on a grid and wired by click or drag. Live truth table, a Boolean
  expression for each output, warnings for unconnected pins, and refusal of
  feedback loops.
- **Guest access.** Every tool works without an account. A guest who chooses to
  save is asked to sign up or log in, and their work is saved to the account
  automatically once they are in.
- **Accounts and projects.** Email and password accounts, a dashboard of saved
  projects, save and reopen in every tool, delete with confirmation.
- **Password reset.** Forgot Password and Reset Password pages using Supabase's
  recovery email.
- **Sharing.** A read-only share link (64-character token) that anyone can open
  without logging in.
- **Tablet support and accessibility.** Every page works at 768 px and wider,
  and text meets the WCAG 2.2 AA contrast ratio.

## Technology

| Layer | Technology | Host |
|---|---|---|
| Frontend | React 18, React Router 6, Vite 5, Tailwind CSS 3, Axios | Vercel |
| Backend | Node.js, Express 4, jsonwebtoken, express-rate-limit | Railway |
| Database and auth | PostgreSQL and Supabase Auth (bcrypt hashing) | Supabase |
| Testing | Vitest 1.6 and Supertest 7 | Local |

## Repository structure

```
EERoom/
├── client/                React frontend (deployed to Vercel)
│   ├── public/media/      Screenshots and diagrams for the portfolio page
│   ├── public/docs/       Project documents (PDF) linked from the portfolio
│   └── src/
│       ├── api/           Axios client and /projects calls
│       ├── components/    Shared UI (ProtectedRoute, ShareButton, WaveformCanvas, GuestSavePrompt)
│       ├── hooks/         useAuth context
│       ├── pages/         One file per route
│       └── utils/         Logic evaluator, waveform math, reset link and guest draft helpers, and their tests
└── server/                Express API (deployed to Railway)
    ├── config/            Supabase clients
    ├── controllers/       Auth and project logic
    ├── db/schema.sql      Database tables
    ├── middleware/        JWT check
    ├── routes/            Auth, projects, and share routes
    ├── tests/             API tests and the in-memory Supabase stand-in
    ├── app.js             Builds the Express app
    └── index.js           Starts the server
```

## Running it locally

Requires Node.js 18 or later and a free Supabase project.

**1. Database.** In Supabase, open the SQL Editor and run
`server/db/schema.sql` to create the `users` and `projects` tables.

**2. Backend**
```bash
cd server
cp .env.example .env    # then fill in the values described below
npm install
npm run dev             # http://localhost:4000
```

**3. Frontend**
```bash
cd client
cp .env.example .env.local
npm install
npm run dev             # http://localhost:5173
```

### Environment variables

`server/.env`

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **secret** key (starts with `sb_secret_`) |
| `JWT_SECRET` | Long random string used to sign EERoom's own login tokens |
| `PORT` | Port for Express (Railway sets its own) |
| `CLIENT_URL` | Comma separated list of origins allowed by CORS |
| `PASSWORD_RESET_URL` | Page the reset email links to, e.g. `http://localhost:5173/reset-password` |

`client/.env.local`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, e.g. `http://localhost:4000` |

`SUPABASE_SERVICE_ROLE_KEY` must be a secret key, not a publishable one. Row
Level Security is on for both tables with no policies, so the server can only
read and write because a secret key bypasses it. A publishable key connects
without an error, then returns no rows and fails every write.

The real `.env` files are excluded by `.gitignore`. Only the `.env.example`
templates, which hold no secrets, are committed.

## Testing

```bash
cd client && npm test     # 82 unit tests: logic evaluator, waveform math, reset link, guest drafts
cd server && npm test     # 37 API tests through the real Express app
```

The server tests use Supertest to send real HTTP requests through the routes,
the JWT middleware, and the controllers. Only Supabase is replaced, by the
in-memory stand-in in `server/tests/fakeSupabase.js`, so they run in seconds and
never touch real data. They cover registration and its rollback, login,
password reset, the rate limiter, every project route including ownership
checks, and public share links.

Manual system test cases (MT-01 to MT-27) and their results are in the
Milestone 5 Coding and Testing document.

## Deployment

| Part | Host | Root directory | URL |
|---|---|---|---|
| Frontend | Vercel | `client` | https://www.eeroom.io |
| Backend | Railway | `server` | https://eeroom-production.up.railway.app |

Both hosts deploy automatically when `main` is pushed. This is a monorepo, so
each host needs its root directory set by hand; without it the build looks for a
`package.json` in the repository root and fails.

- **Vercel** needs `VITE_API_URL` set to the Railway URL. Vite writes `VITE_*`
  values into the bundle at build time, so a change only takes effect after a
  new deploy.
- **Railway** needs every variable in the `server/.env` table. `CLIENT_URL`
  holds `https://www.eeroom.io`, `https://eeroom.io`, and
  `https://eeroom.vercel.app`.
- **Supabase** needs the Site URL set to `https://www.eeroom.io`, and
  `https://www.eeroom.io/reset-password` (plus the localhost equivalent for
  development) on the Redirect URLs list, or reset emails link to the wrong
  place.

**Why `client/vercel.json` exists.** The app uses `BrowserRouter`, and a
production build only contains `index.html` and its assets. Opening
`/share/<token>` or `/portfolio` directly would therefore return a 404. The
rewrite in `vercel.json` sends every path to `index.html` so React Router can
handle it, which is the fix Vercel documents for single page apps:
https://vercel.com/docs/frameworks/frontend/vite. JSON allows no comments, so
this file is documented here instead of in a header.

## Security notes

- Passwords are hashed by Supabase Auth (bcrypt); EERoom never stores them.
- The API issues its own 24-hour JWT, checked by `requireAuth` on every
  project route.
- Every project query is filtered by the user ID from the verified token, so no
  user can read, edit, delete, or share another user's project.
- The `/auth` routes allow 10 requests per 15 minutes per address. `app.js` sets
  `trust proxy` to 1 because Railway forwards requests through a proxy; without
  it every user would share one rate limit bucket.
- The password reset request gives the same answer for every email, so it
  cannot reveal which addresses have accounts.
- Share links return only a project's name, tool type, data, and date, never a
  user ID.

## Source control practices

- All work is committed to `main` in small commits with descriptive messages,
  and every push deploys, so the live site always matches the repository.
- Each milestone's work can be followed through the commit history, from the
  initial scaffolding to the final release.
- Secrets are kept out of the repository with `.gitignore`, and installed
  packages and build output are ignored.

## Project status

| Iteration | Delivered |
|---|---|
| 1 (CST-451) | Scaffolding, authentication, Ohm's Law calculator |
| 2 (Milestone 4) | Waveform and logic tools, dashboard, saving, sharing, deployment, custom domain, rate limiting, 68 unit tests |
| 3 (Milestone 5) | Password reset, guest access, tablet layout and contrast, 37 API tests, 14 more unit tests |
| Release (Milestone 6) | Project portfolio page, final documentation, and this README |

Out of scope, with the reasons recorded in the Requirements Specification: the
DC circuit simulator, Google sign-in, and paid Pro accounts.

## Code documentation and citations

Every source file opens with a header comment that describes its purpose.
Where code follows an external pattern (official documentation or a library's
recommended usage) rather than being original logic, a `Source:` comment with a
URL marks what was adapted and from where. Logic of the developer's own design,
such as the Ohm's Law solve-for branching, the gate evaluator, and the
ownership checks, is not cited.

Files with an external source citation:

- **Server:** `config/supabaseClient.js`, `middleware/authMiddleware.js`,
  `controllers/authController.js`, `controllers/projectController.js`,
  `routes/authRoutes.js`, `app.js`, `tests/fakeSupabase.js`
- **Client configuration:** `vite.config.js`, `postcss.config.js`,
  `vercel.json` (documented in this README)
- **Client shared code:** `api/client.js`, `hooks/useAuth.jsx`, `theme.js`,
  `components/ProtectedRoute.jsx`, `components/ShareButton.jsx`,
  `components/WaveformCanvas.jsx`, `utils/resetLink.js`,
  `utils/pendingDraft.js`
- **Client pages:** `DashboardPage.jsx`, `OhmToolPage.jsx`, `WaveToolPage.jsx`,
  `LogicToolPage.jsx`, `SharedProjectPage.jsx`, `ResetPasswordPage.jsx`
- **Tests:** `logicEvaluator.test.js`, `waveform.test.js`,
  `resetLink.test.js`, `pendingDraft.test.js`

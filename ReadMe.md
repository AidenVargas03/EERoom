# EERoom

Browser-based electrical engineering simulation platform.
CST-452 Senior Project II, Milestone 4 (Coding and Testing, 2nd Code Iteration).

**Live site:** https://www.eeroom.io

## Repo structure

```
eeroom/
├── client/     React 18 + Tailwind frontend (Vercel)
└── server/     Node.js/Express backend (Railway) + Supabase (DB + Auth)
```

## Local setup

**Backend**
```bash
cd server
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
npm install
npm run dev             # http://localhost:4000
```

**Frontend**
```bash
cd client
cp .env.example .env.local
npm install
npm run dev              # http://localhost:5173
```

**Tests**
```bash
cd client
npm test                 # 68 unit tests (Vitest)
npm run test:watch       # re-runs on save
```

**Database:** Supabase (PostgreSQL 15). Create a Supabase project, open the
SQL Editor, and run `server/db/schema.sql` to create the `users` and
`projects` tables. Then copy the project URL and secret key from Supabase ->
Project Settings -> API Keys into `server/.env` (copy `.env.example` first).
User accounts are managed by Supabase Auth. The `users` table mirrors each
account's UUID so `projects.user_id` has a row to reference.

`SUPABASE_SERVICE_ROLE_KEY` must hold a **secret** key, the one that starts
with `sb_secret_`. Do not use a publishable key. Row Level Security is turned
on for both tables with no policies, so the server can only read and write
because a secret key has the `BYPASSRLS` attribute. A publishable key will
connect without complaining, then return no rows on every read and fail every
write.

## Deployment

| Part | Host | Root directory | URL |
|---|---|---|---|
| Frontend | Vercel | `client` | https://www.eeroom.io |
| Backend | Railway | `server` | https://eeroom-production.up.railway.app |

Both hosts deploy automatically when `main` is pushed. This is a monorepo, so
each host needs its root directory set by hand. Without it the build looks for
a `package.json` in the repo root and fails.

**Environment variables in production**

- Vercel needs `VITE_API_URL`, set to the Railway URL. Vite writes `VITE_*`
  values into the bundle when it builds, not when the page loads, so changing
  this value only takes effect after a new deploy.
- Railway needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`,
  `PORT`, and `CLIENT_URL`. `CLIENT_URL` is a comma separated list of every
  origin allowed to call the API, and the CORS setting reads it to decide
  which sites may do so. It currently holds `https://www.eeroom.io`,
  `https://eeroom.io` and `https://eeroom.vercel.app`. A single value was
  enough before the custom domain existed. During a domain changeover both
  the old and the new origin have to work at once, and with one value one of
  them always fails. A rejected origin shows up in the browser as a request
  that simply never returns, which is a confusing way to find out about a
  configuration problem.

**Rate limiting.** The three `/auth` routes allow ten requests per fifteen
minutes per address. They are the only routes a stranger can reach, so an
unlimited `/auth/login` would let someone guess passwords as fast as they
could send requests. Express sits behind Railway's proxy, which is why
`index.js` sets `trust proxy` to 1: without it the caller's real address is
hidden behind the proxy's, every request lands in the same bucket, and ten
failed logins from anybody would lock out everybody.

**Why `client/vercel.json` exists.** The app uses `BrowserRouter`. A
production build only produces `index.html` and the asset files, so asking for
`/share/<token>` or `/dashboard` asks for a file that is not there and gets a
404. That would break every share link, because share links are opened by
pasting a URL rather than by clicking through the app. The rewrite in
`vercel.json` sends any unmatched path to `index.html` and lets React Router
work out the route in the browser. This is the fix Vercel documents for single
page apps: https://vercel.com/docs/frameworks/frontend/vite

That file is the one exception to the header comment rule below. `vercel.json`
has to be valid JSON, and JSON does not allow comments, so adding one would
stop it parsing. It is documented here instead, and its `$schema` key names the
format inside the file.

## Build progress

- [x] 1. Project scaffolding
- [x] 2. Supabase project + schema
- [x] 3. Auth: register/login/logout (tested end to end against the live
      Supabase project)
- [x] 4. Dashboard shell + project save/load/delete
- [x] 5. Ohm's Law Calculator
- [x] 6. Waveform Visualizer, including the live aliasing demonstration
- [x] 7. Logic Gate Sandbox, with truth table and boolean expression
- [x] 8. Share link functionality (backend routes and frontend UI)
- [x] 9. Deploy to Vercel + Railway
- [x] 10. Blueprint dark theme across every page, the landing page, and
      drag-to-connect wiring with wire removal in the logic sandbox
- [x] 11. Custom domain (www.eeroom.io) and rate limiting on the auth routes
- [ ] 12. Milestone 4 write-up, the screencast, and the manual test run. The
      68 client unit tests are written and passing.

## Code documentation / citation policy (for Milestone 4's Source Code
Listing requirement)

Every file has a header comment describing its purpose. Where a chunk of
code follows a specific external pattern (official docs, a library's
recommended usage, or a Stack Overflow answer) rather than being original
logic, there's an inline `// Source: <url>` comment marking exactly what
was adapted and from where. Business logic that's my own design
(e.g. Ohm's Law branching, boolean gate evaluation, project ownership
checks) is not cited, since it isn't derived from an external source.

Files with an explicit source citation so far:

**Server**
- `server/middleware/authMiddleware.js` - Bearer token parsing pattern (Stack Overflow)
- `server/config/supabaseClient.js` - Supabase server-side client setup (official docs)
- `server/controllers/projectController.js` - `crypto.randomBytes` share token generation (Node.js official docs)
- `server/routes/authRoutes.js` - express-rate-limit usage and option names (the library's own proxy troubleshooting guide)
- `server/index.js` - the Express `trust proxy` setting for a server behind a single reverse proxy (same guide)

**Client, configuration**
- `client/vite.config.js` - Vite's default React template scaffold (official docs)
- `client/vercel.json` - SPA rewrite for client-side routing (Vercel official docs). Documented in the section above rather than in the file, because JSON allows no comments.

**Client, shared code**
- `client/src/api/client.js` - axios interceptor pattern (official docs)
- `client/src/hooks/useAuth.jsx` - React Context/Provider pattern (official React docs)
- `client/src/components/ProtectedRoute.jsx` - a `children` guard that returns `<Navigate replace />`, adapted from React Router v6's official `examples/auth` (`RequireAuth`). The official version also passes `state={{ from: location }}` to send the user back to the page they first asked for. EERoom does not do that, so it is left out on purpose.
- `client/src/components/ShareButton.jsx` - `Clipboard.writeText()` usage (MDN)
- `client/src/components/WaveformCanvas.jsx` - correcting canvas resolution on high-DPI screens with `devicePixelRatio` (MDN)

**Client, pages**
- `client/src/pages/DashboardPage.jsx` - Effect cleanup flag, used to throw away a fetch that finishes after the component has gone (official React docs)
- `client/src/pages/OhmToolPage.jsx` - `useSearchParams` for query-string state and `NavigateOptions` (official React Router docs), plus the same Effect cleanup flag (official React docs)
- `client/src/pages/WaveToolPage.jsx` - `useSearchParams` for query-string state (official React Router docs), plus the same Effect cleanup flag (official React docs)
- `client/src/pages/LogicToolPage.jsx` - `useSearchParams` for query-string state (official React Router docs), plus the same Effect cleanup flag (official React docs)
- `client/src/pages/SharedProjectPage.jsx` - the same Effect cleanup flag (official React docs)

**Client, tests**
- `client/src/utils/waveform.test.js` - Vitest API, `describe`/`it`/`expect` (official docs)
- `client/src/utils/logicEvaluator.test.js` - Vitest API, `describe`/`it`/`expect` (official docs)

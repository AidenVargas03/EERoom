# EERoom

Browser-based electrical engineering simulation platform.
CST-452 Senior Project II — Milestone 4 (Coding and Testing, 2nd Code Iteration).

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

**Database:** Supabase (PostgreSQL 15). Create a Supabase project, open the
SQL Editor, and run `server/db/schema.sql` to create the `users` and
`projects` tables. Then copy the project URL and service role key from
Supabase -> Project Settings -> API into `server/.env` (copy `.env.example`
first). User accounts are managed by Supabase Auth; the `users` table mirrors
each account's UUID so `projects.user_id` has a row to reference.

## Build progress (matches handoff doc's recommended order)

- [x] 1. Project scaffolding
- [x] 2. Supabase project + schema
- [x] 3. Auth: register/login/logout (verified end-to-end against the live
      Supabase project)
- [ ] 4. Dashboard shell + project save/load/delete
- [ ] 5. Ohm's Law Calculator
- [ ] 6. Waveform Visualizer
- [ ] 7. Logic Gate Sandbox
- [ ] 8. Share link functionality (backend routes done, frontend UI pending)
- [ ] 9. Deploy to Vercel + Railway
- [ ] 10. Testing, polish, README, final GitHub cleanup

## Code documentation / citation policy (for Milestone 4's Source Code
Listing requirement)

Every file has a header comment describing its purpose. Where a chunk of
code follows a specific external pattern (official docs, a library's
recommended usage, or a Stack Overflow answer) rather than being original
logic, there's an inline `// Source: <url>` comment marking exactly what
was adapted and from where. Business logic that's the student's own design
(e.g. Ohm's Law branching, boolean gate evaluation, project ownership
checks) is not cited, since it isn't derived from an external source.

Files with an explicit source citation so far:
- `server/middleware/authMiddleware.js` — Bearer token parsing pattern (Stack Overflow)
- `server/config/supabaseClient.js` — Supabase server-side client init (official docs)
- `server/controllers/projectController.js` — `crypto.randomBytes` share token generation (Node.js official docs)
- `client/vite.config.js` — Vite's default React template scaffold (official docs)
- `client/src/api/client.js` — axios interceptor pattern (official docs)
- `client/src/hooks/useAuth.jsx` — React Context/Provider pattern (official React docs)
- `client/src/components/ProtectedRoute.jsx` — React Router v6 protected route guard (official docs)
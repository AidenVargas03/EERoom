/**
 * data/portfolioSnippets.js
 * -----------------------------------------------------------------------
 * Code excerpts shown on the portfolio page (/portfolio). Each one is
 * copied from the file named in `file`, trimmed only where a comment
 * says so, with a short note on why it matters.
 * -----------------------------------------------------------------------
 */

export const SNIPPETS = [
  {
    "id": "loops",
    "tab": "Loop detection",
    "title": "Refusing feedback loops instead of guessing",
    "file": "client/src/utils/logicEvaluator.js",
    "why": "A depth-first search tracks the nodes on the current path. Meeting one again means the circuit loops back on itself, which has no single truth table, so the evaluator stops with a clear error.",
    "code": "const resolved = new Set();\nconst inProgress = new Set(); // nodes on the current DFS path - a repeat is a loop\n\nfunction resolve(id) {\n  if (resolved.has(id)) return values[id];\n\n  if (inProgress.has(id)) {\n    throw new Error(\n      `Feedback loop detected at node \"${id}\". A combinational circuit cannot contain a loop.`\n    );\n  }\n\n  inProgress.add(id);\n  // ...evaluate each input pin; an unwired pin reads as 0 and is reported\n  result = node.type === \"OUTPUT\" ? pins[0] : GATES[node.type].evaluate(pins);\n  inProgress.delete(id);\n  resolved.add(id);\n  values[id] = Boolean(result);\n  return values[id];\n}"
  },
  {
    "id": "nyquist",
    "tab": "Nyquist check",
    "title": "Knowing when a sample rate lies",
    "file": "client/src/utils/waveform.js",
    "why": "A signal must be sampled faster than twice its frequency. At or below that rate the samples describe a slower, false wave, so the tool warns the student and draws the alias.",
    "code": "export function isAliased(frequency, sampleRate) {\n  requireFinite(frequency, \"frequency\");\n  requireFinite(sampleRate, \"sampleRate\");\n  return Math.abs(frequency) * 2 >= sampleRate;\n}"
  },
  {
    "id": "ownership",
    "tab": "Ownership filter",
    "title": "Nobody can open someone else's project",
    "file": "server/controllers/projectController.js",
    "why": "The user ID comes from the verified login token, never from the request. Every project query filters on it, so another user's project simply returns 404.",
    "code": "export async function getProjectById(req, res) {\n  const { id } = req.params;\n\n  const { data, error } = await supabase\n    .from(\"projects\")\n    .select(\"*\")\n    .eq(\"project_id\", id)\n    .eq(\"user_id\", req.user.userId) // ownership check\n    .single();\n\n  if (error || !data) {\n    return res.status(404).json({ error: \"Project not found.\" });\n  }\n  return res.status(200).json(data);\n}"
  },
  {
    "id": "limit",
    "tab": "Rate limiting",
    "title": "Slowing down password guessing",
    "file": "server/routes/authRoutes.js",
    "why": "The public login, registration, and reset routes allow 10 requests per 15 minutes from one address. A real user never notices; a script guessing passwords is stopped.",
    "code": "const authLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  limit: 10,\n  standardHeaders: \"draft-7\",\n  legacyHeaders: false,\n  message: { error: \"Too many attempts from this address. Try again in 15 minutes.\" },\n});\n\nrouter.use(authLimiter);\nrouter.post(\"/register\", register);\nrouter.post(\"/login\", login);\nrouter.post(\"/reset-password\", resetPassword);\nrouter.post(\"/update-password\", updatePassword);"
  },
  {
    "id": "draft",
    "tab": "Guest save",
    "title": "Keeping a guest's work through sign-up",
    "file": "client/src/pages/LoginPage.jsx",
    "why": "A guest's work waits in session storage while they register. Right after login it is saved to the new account and reopened, and takePendingDraft removes it so it is never saved twice.",
    "code": "const draft = takePendingDraft();\nif (draft) {\n  try {\n    const created = await createProject(\n      draft.name || DEFAULT_NAMES[draft.toolType],\n      draft.toolType,\n      draft.projectData\n    );\n    navigate(`/tools/${draft.toolType}?project=${created.project_id}`);\n    return;\n  } catch {\n    // The login itself worked, so carry on to the dashboard.\n  }\n}\nnavigate(\"/dashboard\");"
  },
  {
    "id": "test",
    "tab": "API test",
    "title": "Proving the ownership rule holds",
    "file": "server/tests/projects.test.js",
    "why": "Each API test sends a real HTTP request through Express with Supertest. This one logs in as Alice and asks for Bob's project. Removing the ownership filter on purpose made it fail, which proved the test works.",
    "code": "it(\"IT-27 returns 404 for another user's project\", async () => {\n  const p = addProject({ user_id: BOB });\n  const res = await request(app)\n    .get(`/projects/${p.project_id}`)\n    .set(\"Authorization\", bearer(ALICE));\n  expect(res.status).toBe(404);\n});"
  }
];

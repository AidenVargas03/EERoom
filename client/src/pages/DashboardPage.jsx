/**
 * pages/DashboardPage.jsx
 * -----------------------------------------------------------------------
 * The logged-in user's home screen. Three jobs:
 *
 *   1. Quick-launch links into each of the three tools.
 *   2. List every project this user has saved (GET /projects), newest
 *      first, with Open and Delete actions on each one.
 *   3. Show a useful empty state when they have not saved anything yet,
 *      so a brand-new account does not land on a blank page.
 *
 * Ownership is enforced server-side: getAllProjects filters by
 * req.user.userId, so this page can only ever receive the logged-in
 * user's own rows. No filtering is done here.
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { getProjects, deleteProject } from "../api/projects.js";

/**
 * Display metadata for each tool_type the database allows.
 * Keyed by the exact values in the schema's CHECK constraint
 * ('ohm' | 'logic' | 'wave') so a row can never miss a lookup.
 */
const TOOLS = {
  ohm: {
    label: "Ohm's Law",
    path: "/tools/ohm",
    blurb: "Voltage, current, resistance and power",
    badge: "bg-raised text-copper-bright",
  },
  logic: {
    label: "Logic Gates",
    path: "/tools/logic",
    blurb: "Build circuits and auto-generate a truth table",
    badge: "bg-raised text-signal",
  },
  wave: {
    label: "Waveform",
    path: "/tools/wave",
    blurb: "Visualize sine, square, sawtooth and triangle signals",
    badge: "bg-raised text-ok",
  },
};

/**
 * Turn a Postgres timestamptz string into something readable.
 * Guards against a missing/invalid date so one bad row cannot blank
 * out the whole card.
 */
function formatDate(timestamp) {
  if (!timestamp) return "unknown date";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "unknown date";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Which project is waiting on a second click to confirm deletion.
  // An inline confirm instead of window.confirm(): a native dialog
  // blocks the whole page and looks poor in the demo screencast.
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    // `cancelled` stops us calling setState after the component has
    // unmounted. React 18's StrictMode deliberately mounts, unmounts and
    // remounts every component once in development, so without this the
    // first (discarded) mount's fetch would still try to update state and
    // React would warn.
    //
    // Source: React's official "Fetching data with Effects" pattern, which
    // uses a boolean flag (named `ignore` there) set to true in the Effect's
    // cleanup function to discard responses from a cleaned-up Effect -
    // https://react.dev/reference/react/useEffect
    let cancelled = false;

    async function loadProjects() {
      try {
        const data = await getProjects();
        if (!cancelled) setProjects(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              "Could not load your projects. Is the server running?"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []); // empty array = run once when the page first mounts

  /** Open a saved project in the tool that created it. */
  function handleOpen(project) {
    const tool = TOOLS[project.tool_type];
    if (!tool) return;
    // The tool page reads ?project=<id> and loads that row's saved state.
    navigate(`${tool.path}?project=${project.project_id}`);
  }

  /** Delete a project, then drop it from the list without a refetch. */
  async function handleDelete(projectId) {
    try {
      await deleteProject(projectId);
      setProjects((current) =>
        current.filter((p) => p.project_id !== projectId)
      );
    } catch (err) {
      setError(
        err.response?.data?.error || "Could not delete that project."
      );
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="p-8 min-h-screen">
      {/* ---- Header ------------------------------------------------- */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-ink">
          Welcome, {user?.email}
        </h1>
        <button
          onClick={logout}
          className="text-sm text-ink-muted hover:underline"
        >
          Log out
        </button>
      </div>

      {/* ---- Quick launch ------------------------------------------- */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">
          Start a new project
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(TOOLS).map(([key, tool]) => (
            <button
              key={key}
              onClick={() => navigate(tool.path)}
              className="text-left bg-panel border border-rule rounded-lg p-4 hover:border-copper hover:border-copper transition"
            >
              <span className="block font-semibold text-ink">
                {tool.label}
              </span>
              <span className="block text-sm text-ink-muted mt-1">
                {tool.blurb}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ---- Saved projects ----------------------------------------- */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted mb-3">
          Your saved projects
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-danger-surface border border-danger p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading your projects...</p>
        ) : projects.length === 0 ? (
          // Empty state: a new account has nothing saved yet, so point
          // them at something to do rather than showing a blank area.
          <div className="bg-panel border border-dashed border-rule-strong rounded-lg p-8 text-center">
            <p className="text-ink font-medium">No saved projects yet</p>
            <p className="text-ink-muted text-sm mt-1 mb-4">
              Open a tool above, build something, and save it to see it here.
            </p>
            <button
              onClick={() => navigate("/tools/ohm")}
              className="bg-copper text-ground text-sm px-4 py-2 rounded-md hover:bg-copper-bright"
            >
              Try the Ohm's Law calculator
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const tool = TOOLS[project.tool_type];
              return (
                <div
                  key={project.project_id}
                  className="bg-panel border border-rule rounded-lg p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink break-words">
                      {project.name}
                    </h3>
                    <span
                      className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                        tool?.badge || "bg-raised text-ink"
                      }`}
                    >
                      {tool?.label || project.tool_type}
                    </span>
                  </div>

                  <p className="text-xs text-ink-muted mt-2">
                    Updated {formatDate(project.updated_at)}
                  </p>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-rule">
                    <button
                      onClick={() => handleOpen(project)}
                      className="text-sm px-3 py-1.5 rounded-md bg-copper text-ground hover:bg-copper-bright"
                    >
                      Open
                    </button>

                    {confirmingId === project.project_id ? (
                      <>
                        <button
                          onClick={() => handleDelete(project.project_id)}
                          className="text-sm px-3 py-1.5 rounded-md bg-danger text-ground hover:bg-danger"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-sm px-3 py-1.5 rounded-md text-ink-muted hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(project.project_id)}
                        className="text-sm px-3 py-1.5 rounded-md border border-rule-strong text-ink-muted hover:bg-raised"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

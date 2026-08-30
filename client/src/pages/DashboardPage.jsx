/**
 * pages/DashboardPage.jsx
 * -----------------------------------------------------------------------
 * PLACEHOLDER - next build step per the handoff doc's recommended order
 * (step 4: "Dashboard shell + project save/load/delete"). Will fetch
 * GET /projects and render a grid with open/delete actions.
 * -----------------------------------------------------------------------
 */
import { useAuth } from "../hooks/useAuth.jsx";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.email}</h1>
        <button onClick={logout} className="text-sm text-slate-500 hover:underline">
          Log out
        </button>
      </div>
      <p className="text-slate-500">
        TODO: fetch and display saved projects here (GET /projects).
      </p>
    </div>
  );
}

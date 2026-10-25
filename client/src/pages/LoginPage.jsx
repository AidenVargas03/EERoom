/**
 * pages/LoginPage.jsx
 * -----------------------------------------------------------------------
 * Login form. On success, useAuth().login() stores the JWT and user
 * info, then we navigate to /dashboard. On failure, we show the error
 * message the backend returned (e.g. "Invalid email or password.").
 *
 * Iteration 3: if a guest came here from a tool's "Log in to save" or
 * "Sign up to save" button, their work is waiting in sessionStorage
 * (see utils/pendingDraft.js). After login it is saved to the account
 * and opened in its tool instead of going to the dashboard.
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { createProject } from "../api/projects.js";
import { takePendingDraft } from "../utils/pendingDraft.js";

// Fallback names, matching the ones each tool page uses.
const DEFAULT_NAMES = {
  ohm: "Untitled Ohm's Law Project",
  wave: "Untitled Waveform Project",
  logic: "Untitled Logic Project",
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      // err.response is the axios error shape; fall back to a generic
      // message if the backend didn't send one (e.g. network failure).
      setError(err.response?.data?.error || "Login failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    // Logged in. Save any guest work before leaving the page.
    const draft = takePendingDraft();
    if (draft) {
      try {
        const created = await createProject(
          draft.name || DEFAULT_NAMES[draft.toolType],
          draft.toolType,
          draft.projectData
        );
        navigate(`/tools/${draft.toolType}?project=${created.project_id}`);
        return;
      } catch {
        // The login itself worked, so carry on to the dashboard rather
        // than showing an error on a login form that succeeded.
      }
    }
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-raised">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel p-8 rounded-lg border border-rule"
      >
        <h1 className="text-2xl font-bold mb-6 text-ink">Log in to EERoom</h1>

        {error && (
          <div className="mb-4 text-sm text-danger bg-danger-surface border border-danger rounded p-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-ink mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
        />

        <label className="block text-sm font-medium text-ink mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-2 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
        />

        <p className="mb-6 text-right text-sm">
          <Link to="/forgot-password" className="text-copper hover:underline">
            Forgot password?
          </Link>
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-copper text-ground py-2 rounded-md font-medium hover:bg-copper-bright disabled:opacity-50"
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </button>

        <p className="mt-4 text-sm text-center text-ink-muted">
          Don't have an account?{" "}
          <Link to="/register" className="text-copper hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

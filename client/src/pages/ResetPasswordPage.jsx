/**
 * pages/ResetPasswordPage.jsx
 * -----------------------------------------------------------------------
 * Step 2 of the password reset flow (FR-04, finished in iteration 3).
 *
 * The link in the reset email opens this page with a recovery token in
 * the URL fragment. parseResetLink() pulls it out; the user types a new
 * password twice; we POST the token and password to /auth/update-password,
 * where the server checks the token with Supabase before changing anything.
 *
 * The token is cleared from the address bar as soon as it is read, so it
 * does not stay in browser history or get copied if the URL is shared.
 *
 * Source: history.replaceState changes the URL without reloading, MDN -
 * https://developer.mozilla.org/en-US/docs/Web/API/History/replaceState
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client.js";
import { parseResetLink } from "../utils/resetLink.js";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  // Read the fragment on the first render. The initializer must not change
  // the URL itself: React's StrictMode calls it twice in development, and
  // the second call would then find the token already gone.
  const [link] = useState(() => parseResetLink(window.location.hash));

  // Once the token is held in state, wipe it from the address bar.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await client.post("/auth/update-password", { accessToken: link.token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Could not update the password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper";

  return (
    <div className="min-h-screen flex items-center justify-center bg-raised px-4">
      <div className="w-full max-w-sm bg-panel p-8 rounded-lg border border-rule">
        <h1 className="text-2xl font-bold mb-6 text-ink">Choose a new password</h1>

        {link.error ? (
          <>
            <div className="mb-4 text-sm text-danger bg-danger-surface border border-danger rounded p-2">
              {link.error}
            </div>
            <Link to="/forgot-password" className="text-copper hover:underline text-sm">
              Request a new reset link
            </Link>
          </>
        ) : done ? (
          <>
            <div role="status" className="mb-6 text-sm text-ink bg-raised border border-copper rounded p-3">
              Your password has been updated.
            </div>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full bg-copper text-ground py-2 rounded-md font-medium hover:bg-copper-bright"
            >
              Go to Log In
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 text-sm text-danger bg-danger-surface border border-danger rounded p-2">
                {error}
              </div>
            )}

            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={`${inputClass} mb-1`}
            />
            <p className="text-xs text-ink-muted mb-4">At least 8 characters.</p>

            <label htmlFor="confirm" className="block text-sm font-medium text-ink mb-1">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={`${inputClass} mb-6`}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-copper text-ground py-2 rounded-md font-medium hover:bg-copper-bright disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

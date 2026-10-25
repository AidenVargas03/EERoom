/**
 * pages/ForgotPasswordPage.jsx
 * -----------------------------------------------------------------------
 * Step 1 of the password reset flow (FR-04, finished in iteration 3).
 *
 * The user enters their email and we POST it to /auth/reset-password.
 * The server always answers with the same message whether or not the
 * email has an account, so this page never reveals which addresses are
 * registered. Supabase then emails a link to /reset-password.
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const res = await client.post("/auth/reset-password", { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-raised px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel p-8 rounded-lg border border-rule"
      >
        <h1 className="text-2xl font-bold mb-2 text-ink">Reset your password</h1>
        <p className="text-sm text-ink-muted mb-6">
          Enter the email you signed up with and we will send you a reset link.
        </p>

        {error && (
          <div className="mb-4 text-sm text-danger bg-danger-surface border border-danger rounded p-2">
            {error}
          </div>
        )}

        {message ? (
          // role="status" makes screen readers announce the confirmation.
          <div role="status" className="mb-4 text-sm text-ink bg-raised border border-copper rounded p-3">
            {message} The link expires in one hour.
          </div>
        ) : (
          <>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full mb-6 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-copper text-ground py-2 rounded-md font-medium hover:bg-copper-bright disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </>
        )}

        <p className="mt-4 text-sm text-center text-ink-muted">
          <Link to="/login" className="text-copper hover:underline">
            Back to log in
          </Link>
        </p>
      </form>
    </div>
  );
}

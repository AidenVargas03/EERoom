/**
 * pages/LoginPage.jsx
 * -----------------------------------------------------------------------
 * Login form. On success, useAuth().login() stores the JWT and user
 * info, then we navigate to /dashboard. On failure, we show the error
 * message the backend returned (e.g. "Invalid email or password.").
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

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
      navigate("/dashboard");
    } catch (err) {
      // err.response is the axios error shape; fall back to a generic
      // message if the backend didn't send one (e.g. network failure).
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
          className="w-full mb-6 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
        />

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

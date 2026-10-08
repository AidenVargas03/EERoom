/**
 * pages/RegisterPage.jsx
 * -----------------------------------------------------------------------
 * Registration form. Calls useAuth().register() (which hits
 * POST /auth/register), then redirects to /login on success since
 * registration does not automatically log the user in.
 * -----------------------------------------------------------------------
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await register(email, password, fullName);
      // Redirect to login with a query flag so LoginPage could show a
      // "account created, please log in" banner if we add that later.
      navigate("/login?registered=true");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
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
        <h1 className="text-2xl font-bold mb-6 text-ink">Create your EERoom account</h1>

        {error && (
          <div className="mb-4 text-sm text-danger bg-danger-surface border border-danger rounded p-2">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-ink mb-1">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
        />

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
          minLength={8}
          className="w-full mb-6 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-copper"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-copper text-ground py-2 rounded-md font-medium hover:bg-copper-bright disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </button>

        <p className="mt-4 text-sm text-center text-ink-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-copper hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

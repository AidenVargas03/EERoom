/**
 * pages/LandingPage.jsx
 * -----------------------------------------------------------------------
 * PLACEHOLDER - to be built out with the full landing page design
 * (hero section, 3 tool cards, footer) per Milestone 3's Screen Specs.
 * Functional stub for now so routing/build works end-to-end.
 * -----------------------------------------------------------------------
 */
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <h1 className="text-4xl font-bold text-slate-800 mb-2">EERoom</h1>
      <p className="text-slate-600 mb-8">
        Free, browser-based electrical engineering simulation tools.
      </p>
      <div className="flex gap-4">
        <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Log In
        </Link>
        <Link to="/register" className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md">
          Sign Up
        </Link>
      </div>
    </div>
  );
}

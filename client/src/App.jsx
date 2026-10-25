/**
 * App.jsx
 * -----------------------------------------------------------------------
 * Top-level route table for the whole app, matching the 5 UI screens
 * from Milestone 3's Screen Specs:
 *   /                -> Landing page
 *   /login           -> Login
 *   /register        -> Register
 *   /forgot-password -> Request a password reset email (iteration 3)
 *   /reset-password  -> Set a new password from the email link (iteration 3)
 *   /dashboard       -> Dashboard (protected)
 *   /tools/ohm       -> Ohm's Law Calculator (open to guests)
 *   /tools/logic     -> Logic Gate Sandbox (open to guests)
 *   /tools/wave      -> Waveform Visualizer (open to guests)
 *   /share/:token    -> Public read-only shared project view
 *
 * Every route above is built. The tools were finished in the order the
 * Milestone 3 plan set: Ohm's Law first, then the Waveform Visualizer,
 * then the Logic Gate Sandbox.
 * -----------------------------------------------------------------------
 */

import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import OhmToolPage from "./pages/OhmToolPage.jsx";
import LogicToolPage from "./pages/LogicToolPage.jsx";
import WaveToolPage from "./pages/WaveToolPage.jsx";
import SharedProjectPage from "./pages/SharedProjectPage.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/share/:token" element={<SharedProjectPage />} />

      {/* The tools are public so visitors can try them before registering
          (SC-06, iteration 3). Saving still needs an account: the tool
          pages show a sign-up prompt in place of Save for guests, and the
          API rejects any save without a valid token. */}
      <Route path="/tools/ohm" element={<OhmToolPage />} />
      <Route path="/tools/logic" element={<LogicToolPage />} />
      <Route path="/tools/wave" element={<WaveToolPage />} />

      {/* Protected route - redirect to /login if not authenticated */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

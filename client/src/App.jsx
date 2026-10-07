/**
 * App.jsx
 * -----------------------------------------------------------------------
 * Top-level route table for the whole app, matching the 5 UI screens
 * from Milestone 3's Screen Specs:
 *   /                -> Landing page
 *   /login           -> Login
 *   /register        -> Register
 *   /dashboard       -> Dashboard (protected)
 *   /tools/ohm       -> Ohm's Law Calculator (protected)
 *   /tools/logic     -> Logic Gate Sandbox (protected)
 *   /tools/wave      -> Waveform Visualizer (protected)
 *   /share/:token    -> Public read-only shared project view
 *
 * Each page component currently is a placeholder stub - they'll be
 * filled in as we build each tool (see handoff doc's recommended build
 * order: Ohm's Law first, then Waveform, then Logic Gate Sandbox last).
 * -----------------------------------------------------------------------
 */

import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
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
      <Route path="/share/:token" element={<SharedProjectPage />} />

      {/* Protected routes - redirect to /login if not authenticated */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools/ohm"
        element={
          <ProtectedRoute>
            <OhmToolPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools/logic"
        element={
          <ProtectedRoute>
            <LogicToolPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools/wave"
        element={
          <ProtectedRoute>
            <WaveToolPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

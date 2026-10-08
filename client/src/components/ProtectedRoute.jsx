/**
 * components/ProtectedRoute.jsx
 * -----------------------------------------------------------------------
 * Wraps a page element and only renders it if the user is logged in
 * (per useAuth's isLoggedIn flag). Otherwise redirects to /login.
 *
 * Usage: <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
 *
 * Source: adapted from React Router v6's official "auth" example, which
 * defines a RequireAuth({ children }) component that returns <Navigate>
 * when there is no authenticated user and renders children when there is -
 * https://github.com/remix-run/react-router/blob/365fefc90b861c51a1a9008df5aa035f2d7dc165/examples/auth/src/App.tsx
 *
 * Adapted rather than copied: the official example also passes
 * state={{ from: location }} so a user can be sent back to the page they
 * originally requested once they log in. EERoom has no return-to-intended-
 * page behaviour, so that state is deliberately omitted and every login
 * lands on the dashboard.
 * -----------------------------------------------------------------------
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function ProtectedRoute({ children }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    // `replace` avoids leaving the protected page in browser history,
    // so hitting "back" after being bounced doesn't loop them right
    // back to the page they were denied.
    return <Navigate to="/login" replace />;
  }

  return children;
}
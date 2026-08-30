/**
 * components/ProtectedRoute.jsx
 * -----------------------------------------------------------------------
 * Wraps a page element and only renders it if the user is logged in
 * (per useAuth's isLoggedIn flag). Otherwise redirects to /login.
 *
 * Usage: <Route path="/dashboard" element={<ProtectedRoute><Dashboard/></ProtectedRoute>} />
 *
 * Pattern source: this is React Router v6's officially documented
 * "protected routes" approach (Navigate + Outlet-style guard component) -
 * https://reactrouter.com/en/main/start/tutorial#protected-routes
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

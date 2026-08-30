/**
 * hooks/useAuth.jsx
 * -----------------------------------------------------------------------
 * React Context that tracks whether a user is logged in, and exposes
 * login/logout/register functions to any component via the useAuth()
 * hook. This avoids passing user/token props down through every layer
 * of the component tree ("prop drilling").
 *
 * Token persistence: we store the JWT in localStorage so a page refresh
 * doesn't log the user out. On first load, we check localStorage for an
 * existing token and treat the user as logged in if one is present.
 * (For MVP scope we trust the token until an API call returns 401 —
 * we don't decode/verify expiry client-side, since the backend already
 * rejects expired tokens on every protected request.)
 *
 * Context + Provider pattern source: this follows the standard pattern
 * from the official React docs -
 * https://react.dev/learn/passing-data-deeply-with-context
 * -----------------------------------------------------------------------
 */

import { createContext, useContext, useState } from "react";
import client from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize from localStorage so refreshing the page keeps you logged in
  const [token, setToken] = useState(() => localStorage.getItem("eeroom_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("eeroom_user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(email, password) {
    const res = await client.post("/auth/login", { email, password });
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem("eeroom_token", newToken);
    localStorage.setItem("eeroom_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  async function register(email, password, fullName) {
    // Registration doesn't log the user in automatically - after this
    // succeeds, the calling component should redirect to /login.
    await client.post("/auth/register", { email, password, fullName });
  }

  function logout() {
    localStorage.removeItem("eeroom_token");
    localStorage.removeItem("eeroom_user");
    setToken(null);
    setUser(null);
  }

  const value = {
    token,
    user,
    isLoggedIn: !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook so components do `const { user, login } = useAuth()` */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

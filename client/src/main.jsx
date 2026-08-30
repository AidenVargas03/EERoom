/**
 * main.jsx
 * -----------------------------------------------------------------------
 * Standard Vite + React 18 mount point. Renders <App /> into the #root
 * div from index.html, wrapped in React.StrictMode (highlights
 * potential problems in dev, no effect in production build) and
 * BrowserRouter (enables React Router v6 route matching everywhere
 * below it in the tree).
 * -----------------------------------------------------------------------
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./hooks/useAuth.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AuthProvider makes the logged-in user + token available to
          every page via the useAuth() hook, without prop-drilling */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

/**
 * index.js
 * -----------------------------------------------------------------------
 * Entry point for the EERoom backend API.
 *
 * Responsibilities:
 *   1. Load environment variables (.env): Supabase keys, JWT secret, port
 *   2. Configure Express app-level middleware (CORS, JSON body parsing)
 *   3. Mount route modules for auth and projects
 *   4. Start the HTTP server
 *
 * This file intentionally stays thin. It should only wire things
 * together. Actual request-handling logic lives in /controllers,
 * and route -> controller mapping lives in /routes.
 *
 * Milestone 4 traceability: satisfies NFR around modular backend
 * architecture described in Milestone 3's Final Architecture Plan
 * (see EERoom Milestone 3 doc, Section: Logical Architecture).
 * -----------------------------------------------------------------------
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import shareRoutes from "./routes/shareRoutes.js";

// Load variables from .env into process.env (SUPABASE_URL, SUPABASE_KEY,
// JWT_SECRET, PORT). dotenv must run before anything that reads process.env.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ---- Global Middleware -------------------------------------------------

// Allow the deployed frontend to call this API, and nothing else.
//
// CLIENT_URL may hold several origins separated by commas. That matters
// during a domain changeover: eeroom.io and the eeroom-*.vercel.app URL
// both need to work until DNS has settled everywhere, and with a single
// value one of them always fails. A rejected origin shows up in the
// browser as a request that simply never returns, which is a confusing
// way to find out about a configuration problem.
//
// With nothing configured it falls back to "*", which is fine for local
// development and must never be the case in production.
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
  })
);

// Parse incoming JSON request bodies into req.body
app.use(express.json());

// ---- Routes --------------------------------------------------------------
// /auth/*          -> register, login, password reset (public)
// /projects/*      -> CRUD for saved simulation projects (JWT-protected)
// /share/*         -> public read-only project loading by share token
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/share", shareRoutes);

// Simple health check endpoint - useful for confirming Railway deployment
// is alive without hitting a real feature.
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "eeroom-server" });
});

// ---- Fallback error handler ---------------------------------------------
// Catches anything thrown/passed to next(err) in route handlers so the
// client always gets a JSON error instead of an HTML stack trace page.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`EERoom server listening on port ${PORT}`);
});
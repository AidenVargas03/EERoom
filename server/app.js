/**
 * app.js
 * -----------------------------------------------------------------------
 * Builds and configures the Express app: CORS, JSON body parsing, the
 * route modules, the health check, and the fallback error handler.
 *
 * Split out of index.js in iteration 3 so the automated API tests can
 * import the app and send it requests with Supertest without starting a
 * real server on a port. index.js now only imports this and listens.
 *
 * Source: Supertest accepts an Express app directly and binds it to a
 * temporary port for each test - https://github.com/ladjs/supertest
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
// Railway terminates TLS and forwards the request on, so the caller's
// real address arrives in the X-Forwarded-For header rather than on the
// socket. Without this setting every request looks like it came from the
// proxy, and the rate limiter on the auth routes puts all users in one
// bucket: ten failed logins from anybody would lock out everybody. The 1
// is the number of proxies sitting in front of this server.
// Source: express-rate-limit's proxy troubleshooting guide -
// https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
app.set("trust proxy", 1);

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

export default app;

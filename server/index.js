/**
 * index.js
 * -----------------------------------------------------------------------
 * Entry point for the EERoom backend API.
 *
 * Responsibilities:
 *   1. Load environment variables (.env): Supabase keys, JWT secret, port
 *   2. Start the HTTP server
 *
 * The app itself (middleware, routes, error handler) is built in app.js,
 * which was split out in iteration 3 so the API tests can use it without
 * opening a port.
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

import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`EERoom server listening on port ${PORT}`);
});

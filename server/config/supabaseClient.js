/**
 * config/supabaseClient.js
 * -----------------------------------------------------------------------
 * Creates a single shared Supabase client instance used by every
 * controller that needs to talk to the database (users, projects).
 *
 * We use the SERVICE ROLE key here (not the anon/public key) because
 * this client runs on the trusted backend server, not in the browser.
 * The service role key bypasses Row Level Security, so all authorization
 * checks (e.g. "does this project belong to this user?") must be done
 * explicitly in our own controller code — Supabase will not do it for us
 * on the server side the way it would for a client-side anon-key call.
 *
 * Source pattern reference: this initialization follows Supabase's own
 * "Server-side/Node quickstart" docs —
 * https://supabase.com/docs/reference/javascript/initializing
 * -----------------------------------------------------------------------
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // Fail loudly at startup rather than letting every request silently
  // 500 with a confusing "cannot read property of undefined" later.
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
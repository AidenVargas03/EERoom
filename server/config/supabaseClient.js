/**
 * config/supabaseClient.js
 * -----------------------------------------------------------------------
 * Creates the Supabase clients used by the backend. There are two, and
 * they are deliberately separate instances.
 *
 *   supabase      - every database query (users, projects) and every
 *                   admin auth call. Authenticates with the SERVICE ROLE
 *                   key, which carries BYPASSRLS.
 *   supabaseAuth  - used ONLY to sign a user in or send a password reset.
 *
 * Why they must be separate:
 *
 * supabase-js stores a session ON THE CLIENT INSTANCE after a successful
 * signInWithPassword(). From that point the instance sends that user's
 * access token as its Authorization header instead of the service role
 * key, so PostgREST runs the request as the `authenticated` role rather
 * than `service_role`. Row Level Security is enabled on both tables with
 * no policies, so every later query from that instance is denied with
 * "new row violates row-level security policy".
 *
 * This server is one long-running process, so with a single shared client
 * one login would downgrade the client for EVERY subsequent request from
 * EVERY user until the process restarted. Keeping sign-in on its own
 * instance means the data client's credentials never change.
 *
 * persistSession and autoRefreshToken are off on both: a server has no
 * browser storage to persist a session into, and no user session that
 * needs keeping alive between requests.
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

const serverSideAuthOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

/** Database + admin client. Must never be used to sign a user in. */
export const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  serverSideAuthOptions
);

/** Sign-in / password-reset client. Must never be used for queries. */
export const supabaseAuth = createClient(
  supabaseUrl,
  supabaseServiceKey,
  serverSideAuthOptions
);
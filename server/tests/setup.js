/**
 * tests/setup.js
 * Runs before every test file (see vitest.config.js).
 *
 * Supplies the environment variables the server reads, and replaces the
 * Supabase clients with the in-memory fake so no test reaches the real
 * database.
 */

import { vi } from "vitest";

process.env.JWT_SECRET = "test-secret";
process.env.PASSWORD_RESET_URL = "https://www.eeroom.io/reset-password";

vi.mock("../config/supabaseClient.js", async () => {
  const fake = await import("./fakeSupabase.js");
  return { supabase: fake.supabase, supabaseAuth: fake.supabaseAuth };
});

// The controllers log server-side failures on purpose. Several tests cause
// those failures deliberately, so keep the test output readable.
vi.spyOn(console, "error").mockImplementation(() => {});

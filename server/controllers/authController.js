/**
 * controllers/authController.js
 * -----------------------------------------------------------------------
 * Implements the actual logic behind /auth/register, /auth/login, and
 * /auth/reset-password. Supabase Auth handles password hashing (bcrypt)
 * and storage for us — we don't touch raw passwords or write our own
 * hashing code, which is the safer, industry-standard approach.
 *
 * Note: Supabase's built-in `auth.users` table is separate from our own
 * `users` table in the schema (Milestone 3, Section 4). We keep a row in
 * our own `users` table too so we can attach app-specific fields like
 * `full_name` and relate `projects.user_id` to it via foreign key.
 * -----------------------------------------------------------------------
 */

import jwt from "jsonwebtoken";
import { supabase } from "../config/supabaseClient.js";

/**
 * POST /auth/register
 * Body: { email, password, fullName }
 *
 * Creates the user in Supabase Auth (handles hashing + storage),
 * then mirrors a row into our own `users` table so `projects.user_id`
 * has something to reference.
 */
export async function register(req, res) {
  const { email, password, fullName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Step 1: create the auth user (Supabase hashes + stores the password)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email verification step for MVP scope
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Step 2: mirror into our own `users` table (id, email, full_name)
    // We reuse the UUID Supabase Auth generated so both tables stay linked.
    const { error: dbError } = await supabase.from("users").insert({
      user_id: authData.user.id,
      email,
      full_name: fullName || null,
      // password_hash column exists in the schema for completeness, but
      // Supabase Auth is the actual source of truth for credentials —
      // we don't duplicate the real hash here.
      password_hash: "managed_by_supabase_auth",
    });

    if (dbError) {
      return res.status(500).json({ error: dbError.message });
    }

    return res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed unexpectedly." });
  }
}

/**
 * POST /auth/login
 * Body: { email, password }
 *
 * Verifies credentials via Supabase Auth, then issues our OWN
 * short-lived JWT (24hr expiry, per Milestone 3 spec) that the frontend
 * stores and sends back as "Authorization: Bearer <token>" on every
 * protected request.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Deliberately vague message - don't reveal whether it was the
    // email or the password that was wrong (standard security practice,
    // avoids helping an attacker enumerate valid accounts).
    return res.status(401).json({ error: "Invalid email or password." });
  }

  // Issue our app's own JWT, separate from Supabase's session token,
  // so our authMiddleware only needs to know about one token format.
  const token = jwt.sign(
    { userId: data.user.id, email: data.user.email },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  return res.status(200).json({ token, user: { id: data.user.id, email: data.user.email } });
}

/**
 * POST /auth/reset-password
 * Body: { email }
 *
 * Delegates to Supabase Auth's built-in password reset email flow.
 * We don't implement our own email sending or reset-token logic.
 */
export async function resetPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ message: "Password reset email sent." });
}
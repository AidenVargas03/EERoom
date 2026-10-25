/**
 * controllers/authController.js
 * -----------------------------------------------------------------------
 * Implements the actual logic behind /auth/register, /auth/login, and
 * /auth/reset-password. Supabase Auth handles password hashing (bcrypt)
 * and storage for us, so we don't touch raw passwords or write our own
 * hashing code, which is the safer, industry-standard approach.
 *
 * Note: Supabase's built-in `auth.users` table is separate from our own
 * `users` table in the schema (Milestone 3, Section 4). We keep a row in
 * our own `users` table too so we can attach app-specific fields like
 * `full_name` and relate `projects.user_id` to it via foreign key.
 * -----------------------------------------------------------------------
 */

import jwt from "jsonwebtoken";
import { supabase, supabaseAuth } from "../config/supabaseClient.js";

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
      // Supabase Auth is the actual source of truth for credentials, so
      // we don't duplicate the real hash here.
      password_hash: "managed_by_supabase_auth",
    });

    if (dbError) {
      // Compensating rollback. Nothing above is transactional: the auth user
      // from step 1 already exists, so if step 2 fails we have to undo it by
      // hand. Without this the account is left able to log in (login only
      // checks Supabase Auth) but unable to save anything (projects.user_id
      // has no row to reference), and the email can never be re-registered
      // because step 1 would then fail with "already registered".
      console.error("Mirror row insert failed, rolling back auth user:", dbError.message);

      const { error: rollbackError } = await supabase.auth.admin.deleteUser(
        authData.user.id
      );

      if (rollbackError) {
        // The rollback itself failed, so an orphaned auth user now exists.
        // Log the id so it can be cleaned up by hand in the Supabase console.
        console.error(
          "ROLLBACK FAILED - orphaned auth user:",
          authData.user.id,
          rollbackError.message
        );
      }

      // Deliberately generic: dbError.message is a raw Postgres error that
      // would leak our table and column names to the browser.
      return res.status(500).json({ error: "Registration failed. Please try again." });
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

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
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
 * Step 1 of the reset flow. Delegates to Supabase Auth's built-in
 * password reset email. We don't implement our own email sending or
 * reset-token logic.
 *
 * redirectTo is where the link in the email sends the user. It comes
 * from PASSWORD_RESET_URL rather than from the request, so nobody can
 * make the email point at a different site. Supabase also refuses any
 * redirect that is not on the project's Redirect URLs list.
 *
 * The response is the same whether or not the email belongs to an
 * account. Saying "no account with that email" would let anyone check
 * which addresses are registered.
 */
export async function resetPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
    redirectTo: process.env.PASSWORD_RESET_URL,
  });

  if (error) {
    // Logged for us, never sent to the browser (see the comment above).
    console.error("Password reset email failed:", error.message);
  }

  return res.status(200).json({
    message: "If an account exists for that email, a reset link is on its way.",
  });
}

/**
 * POST /auth/update-password
 * Body: { accessToken, password }
 *
 * Step 2 of the reset flow. The link in the reset email lands on the
 * frontend's /reset-password page with a short-lived Supabase recovery
 * token in the URL. The page sends that token here with the new password.
 *
 * supabase.auth.getUser(token) asks Supabase whether the token is real and
 * unexpired, and tells us whose it is. Only then do we change that user's
 * password with the admin API. The user id always comes from the verified
 * token, never from the request body.
 *
 * Source: Supabase JavaScript reference for auth.getUser(jwt) and
 * auth.admin.updateUserById(uid, attributes) -
 * https://supabase.com/docs/reference/javascript/auth-getuser
 * https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
 */
export async function updatePassword(req, res) {
  const { accessToken, password } = req.body;

  if (!accessToken || !password) {
    return res.status(400).json({ error: "Reset token and new password are required." });
  }

  // Same minimum the Register form enforces.
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);

  if (error || !data?.user) {
    return res.status(401).json({
      error: "This reset link is invalid or has expired. Request a new one.",
    });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, {
    password,
  });

  if (updateError) {
    console.error("Password update failed:", updateError.message);
    return res.status(500).json({ error: "Could not update the password. Please try again." });
  }

  return res.status(200).json({ message: "Password updated. You can now log in." });
}

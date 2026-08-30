/**
 * middleware/authMiddleware.js
 * -----------------------------------------------------------------------
 * Express middleware that protects private routes (e.g. GET /projects,
 * POST /projects) by requiring a valid JWT bearer token.
 *
 * Flow:
 *   1. Read the "Authorization" header
 *   2. Confirm it's formatted as "Bearer <token>"
 *   3. Verify the token's signature and expiry using our JWT secret
 *   4. Attach the decoded user info to req.user so downstream
 *      controllers know WHO is making the request
 *   5. If anything fails, respond 401 Unauthorized and stop the request
 *      from reaching the controller at all
 *
 * Source: the "Bearer <token>" header-splitting pattern below is a very
 * common community idiom for Express + jsonwebtoken. Adapted from the
 * accepted answer here:
 * https://stackoverflow.com/questions/50384817/verify-jwt-token-in-express-middleware
 * (structure reused; variable names and error handling rewritten for
 * this project's conventions.)
 * -----------------------------------------------------------------------
 */

import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];

  // Expecting header format: "Authorization: Bearer eyJhbGciOi..."
  // If there's no header at all, or it doesn't start with "Bearer ",
  // reject immediately - there's nothing to verify.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed auth token." });
  }

  // Split "Bearer <token>" on the space and take just the token part
  const token = authHeader.split(" ")[1];

  try {
    // jwt.verify throws if the signature is invalid OR the token is
    // expired (we issue tokens with a 24hr expiry per Milestone 3 spec).
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Make the authenticated user's id available to every controller
    // that runs after this middleware (e.g. req.user.userId)
    req.user = decoded;

    next(); // continue to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
/**
 * tests/helpers.js
 * Small helpers shared by the API test files.
 */

import jwt from "jsonwebtoken";

/** A valid EERoom JWT for the given user, signed with the test secret. */
export function tokenFor(userId, email = "student@example.com", options = { expiresIn: "1h" }) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, options);
}

/** The Authorization header value for that token. */
export function bearer(userId) {
  return `Bearer ${tokenFor(userId)}`;
}

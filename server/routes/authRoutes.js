/**
 * routes/authRoutes.js
 * -----------------------------------------------------------------------
 * Defines the public authentication endpoints from Milestone 3's API
 * table:
 *   POST /auth/register
 *   POST /auth/login
 *   POST /auth/reset-password
 *
 * None of these require the requireAuth middleware, since a user can't
 * have a token before they've registered/logged in.
 *
 * They are rate limited instead, which is the Security Design's answer
 * to the same problem. These three are the only routes a stranger can
 * reach, so they are the only ones worth attacking: an unlimited
 * /auth/login lets someone guess passwords as fast as they can send
 * requests, and the generic "Invalid email or password" message does
 * nothing to slow that down.
 *
 * Ten attempts per fifteen minutes per address is the figure from the
 * Security Design. It is high enough that someone mistyping a password
 * never meets it.
 *
 * The limiter covers the whole router rather than login alone, so
 * registration cannot be used to create accounts in bulk and the reset
 * endpoint cannot be used to send somebody a flood of email.
 *
 * Source: express-rate-limit usage and options, from the library's own
 * proxy troubleshooting guide, which carries a complete worked example -
 * https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
 * (the option names and shape are taken from there; the window, the
 * limit and the message are this project's own.)
 * -----------------------------------------------------------------------
 */

import express from "express";
import rateLimit from "express-rate-limit";
import { register, login, resetPassword } from "../controllers/authController.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts from this address. Try again in 15 minutes." },
});

const router = express.Router();

router.use(authLimiter);

router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", resetPassword);

export default router;
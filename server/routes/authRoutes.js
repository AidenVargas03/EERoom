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
 * -----------------------------------------------------------------------
 */

import express from "express";
import { register, login, resetPassword } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/reset-password", resetPassword);

export default router;
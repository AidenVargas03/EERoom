/**
 * routes/projectRoutes.js
 * -----------------------------------------------------------------------
 * All routes here require a logged-in user (requireAuth middleware runs
 * first on every one of them), matching the "Auth?" = Yes column for
 * these endpoints in Milestone 3's API table.
 * -----------------------------------------------------------------------
 */

import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  getAllProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  generateShareLink,
} from "../controllers/projectController.js";

const router = express.Router();

// requireAuth runs first on every route below; if it fails, the request
// never reaches the controller function.
router.get("/", requireAuth, getAllProjects);
router.post("/", requireAuth, createProject);
router.get("/:id", requireAuth, getProjectById);
router.put("/:id", requireAuth, updateProject);
router.delete("/:id", requireAuth, deleteProject);
router.post("/:id/share", requireAuth, generateShareLink);

export default router;
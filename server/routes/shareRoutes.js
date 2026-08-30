/**
 * routes/shareRoutes.js
 * -----------------------------------------------------------------------
 * GET /share/:token — public, read-only. No requireAuth here on purpose:
 * anyone with the link (logged in or not) should be able to view a
 * shared project, per the "Shareable read-only project URLs" MVP
 * requirement.
 * -----------------------------------------------------------------------
 */

import express from "express";
import { supabase } from "../config/supabaseClient.js";

const router = express.Router();

router.get("/:token", async (req, res) => {
  const { token } = req.params;

  const { data, error } = await supabase
    .from("projects")
    .select("name, tool_type, project_data, created_at")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Shared project not found." });
  }

  // Only return the fields a public viewer needs - never leak user_id
  // or internal project_id through the public share endpoint.
  return res.status(200).json(data);
});

export default router;
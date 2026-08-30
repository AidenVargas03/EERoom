/**
 * controllers/projectController.js
 * -----------------------------------------------------------------------
 * CRUD logic for the `projects` table. Every function here assumes
 * requireAuth already ran, so req.user.userId is guaranteed to exist.
 *
 * IMPORTANT security note: because our Supabase client uses the SERVICE
 * ROLE key (see config/supabaseClient.js), Supabase's Row Level Security
 * does NOT automatically stop User A from reading/editing User B's
 * project. We must manually filter every query by
 * `.eq("user_id", req.user.userId)` ourselves. This is called out
 * explicitly in Milestone 3's Security Design section.
 * -----------------------------------------------------------------------
 */

import crypto from "crypto";
import { supabase } from "../config/supabaseClient.js";

/** GET /projects — list all projects owned by the logged-in user */
export async function getAllProjects(req, res) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", req.user.userId)
    .order("updated_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

/**
 * POST /projects — create a new project
 * Body: { name, tool_type, project_data }
 * tool_type must be one of 'ohm' | 'logic' | 'wave' (enforced by the
 * CHECK constraint in the DB schema too — this is a friendlier
 * pre-check so the client gets a clear 400 instead of a raw DB error).
 */
export async function createProject(req, res) {
  const { name, tool_type, project_data } = req.body;
  const validTypes = ["ohm", "logic", "wave"];

  if (!name || !tool_type || !project_data) {
    return res.status(400).json({ error: "name, tool_type, and project_data are required." });
  }
  if (!validTypes.includes(tool_type)) {
    return res.status(400).json({ error: `tool_type must be one of: ${validTypes.join(", ")}` });
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: req.user.userId,
      name,
      tool_type,
      project_data,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}

/** GET /projects/:id — load one project, only if it belongs to this user */
export async function getProjectById(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("project_id", id)
    .eq("user_id", req.user.userId) // ownership check
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Project not found." });
  }
  return res.status(200).json(data);
}

/** PUT /projects/:id — update an existing project (name and/or project_data) */
export async function updateProject(req, res) {
  const { id } = req.params;
  const { name, project_data } = req.body;

  // Build an update payload with only the fields the client actually sent,
  // plus updated_at bumped to now so the dashboard can sort by recency.
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (project_data !== undefined) updates.project_data = project_data;

  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("project_id", id)
    .eq("user_id", req.user.userId) // prevents editing someone else's project
    .select()
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Project not found or update failed." });
  }
  return res.status(200).json(data);
}

/** DELETE /projects/:id — delete a project owned by this user */
export async function deleteProject(req, res) {
  const { id } = req.params;

  const { error, count } = await supabase
    .from("projects")
    .delete({ count: "exact" })
    .eq("project_id", id)
    .eq("user_id", req.user.userId);

  if (error) return res.status(500).json({ error: error.message });
  if (count === 0) return res.status(404).json({ error: "Project not found." });

  return res.status(200).json({ message: "Project deleted." });
}

/**
 * POST /projects/:id/share — generate (or return existing) a shareable
 * read-only token for this project.
 *
 * Token generation approach: crypto.randomBytes(32).toString("hex")
 * gives a 64-character random hex string — far too large to brute-force
 * guess, and Node's built-in `crypto` module means no extra dependency.
 * Source: Node.js official crypto docs -
 * https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
 */
export async function generateShareLink(req, res) {
  const { id } = req.params;

  const shareToken = crypto.randomBytes(32).toString("hex");

  const { data, error } = await supabase
    .from("projects")
    .update({ share_token: shareToken, is_shared: true })
    .eq("project_id", id)
    .eq("user_id", req.user.userId)
    .select("share_token")
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Project not found." });
  }

  return res.status(200).json({ shareToken: data.share_token });
}

/**
 * api/projects.js
 * -----------------------------------------------------------------------
 * Thin wrapper functions around the /projects endpoints, so tool pages
 * (Ohm's Law, Logic Gate, Waveform) don't each re-implement the same
 * axios calls. Every function here assumes the user is already logged
 * in - the JWT is attached automatically by the interceptor in
 * api/client.js.
 * -----------------------------------------------------------------------
 */
 
import client from "./client.js";
 
/** Fetch all projects owned by the logged-in user. */
export async function getProjects() {
  const res = await client.get("/projects");
  return res.data;
}
 
/** Fetch a single project by its ID. */
export async function getProject(projectId) {
  const res = await client.get(`/projects/${projectId}`);
  return res.data;
}
 
/**
 * Create a new saved project.
 * @param {string} name - display name for the project
 * @param {"ohm"|"logic"|"wave"} toolType - which tool this project belongs to
 * @param {object} projectData - the tool-specific state to persist (JSONB on the backend)
 */
export async function createProject(name, toolType, projectData) {
  const res = await client.post("/projects", {
    name,
    tool_type: toolType,
    project_data: projectData,
  });
  return res.data;
}
 
/** Update an existing project's name and/or data. */
export async function updateProject(projectId, updates) {
  const res = await client.put(`/projects/${projectId}`, updates);
  return res.data;
}
 
/** Delete a project by ID. */
export async function deleteProject(projectId) {
  const res = await client.delete(`/projects/${projectId}`);
  return res.data;
}
 
/** Generate (or refresh) a shareable read-only link for a project. */
export async function shareProject(projectId) {
  const res = await client.post(`/projects/${projectId}/share`);
  return res.data;
}
 

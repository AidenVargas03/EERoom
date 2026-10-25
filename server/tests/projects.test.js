/**
 * API tests: saved projects (FR-27 to FR-30) and the JWT middleware.
 * Two users exist in every test so ownership checks are exercised.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { reset, state, addProject } from "./fakeSupabase.js";
import { bearer, tokenFor } from "./helpers.js";

const ALICE = "11111111-1111-1111-1111-111111111111";
const BOB = "22222222-2222-2222-2222-222222222222";

beforeEach(() => reset());

describe("JWT middleware on /projects", () => {
  it("IT-18 rejects a request with no token", async () => {
    const res = await request(app).get("/projects");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing or malformed auth token.");
  });

  it("IT-19 rejects a token signed with the wrong secret", async () => {
    const forged = jwt.sign({ userId: ALICE }, "not-the-secret");
    const res = await request(app).get("/projects").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token.");
  });

  it("IT-20 rejects an expired token", async () => {
    const expired = tokenFor(ALICE, "a@example.com", { expiresIn: "-1s" });
    const res = await request(app).get("/projects").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });
});

describe("POST /projects", () => {
  it("IT-21 saves a project owned by the caller", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", bearer(ALICE))
      .send({ name: "Lab 1", tool_type: "wave", project_data: { frequency: 60 } });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ user_id: ALICE, name: "Lab 1", tool_type: "wave" });
    expect(state.tables.projects).toHaveLength(1);
  });

  it("IT-22 rejects an unknown tool type", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", bearer(ALICE))
      .send({ name: "Old", tool_type: "circuit", project_data: {} });
    expect(res.status).toBe(400);
    expect(state.tables.projects).toHaveLength(0);
  });

  it("IT-23 rejects a project with no data", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", bearer(ALICE))
      .send({ name: "Empty", tool_type: "ohm" });
    expect(res.status).toBe(400);
  });

  it("IT-24 ignores a user_id in the body and uses the token's user", async () => {
    const res = await request(app)
      .post("/projects")
      .set("Authorization", bearer(ALICE))
      .send({ name: "Sneaky", tool_type: "ohm", project_data: {}, user_id: BOB });
    expect(res.status).toBe(201);
    expect(res.body.user_id).toBe(ALICE);
  });
});

describe("GET /projects", () => {
  it("IT-25 lists only the caller's projects, newest first", async () => {
    addProject({ user_id: ALICE, name: "Older", updated_at: "2026-10-01T00:00:00.000Z" });
    addProject({ user_id: ALICE, name: "Newer", updated_at: "2026-10-20T00:00:00.000Z" });
    addProject({ user_id: BOB, name: "Bob's" });

    const res = await request(app).get("/projects").set("Authorization", bearer(ALICE));
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.name)).toEqual(["Newer", "Older"]);
  });
});

describe("GET /projects/:id", () => {
  it("IT-26 loads the caller's own project", async () => {
    const p = addProject({ user_id: ALICE, name: "Mine" });
    const res = await request(app).get(`/projects/${p.project_id}`).set("Authorization", bearer(ALICE));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Mine");
  });

  it("IT-27 returns 404 for another user's project", async () => {
    const p = addProject({ user_id: BOB });
    const res = await request(app).get(`/projects/${p.project_id}`).set("Authorization", bearer(ALICE));
    expect(res.status).toBe(404);
  });
});

describe("PUT /projects/:id", () => {
  it("IT-28 renames the caller's project and bumps updated_at", async () => {
    const p = addProject({ user_id: ALICE, name: "Old name", updated_at: "2026-01-01T00:00:00.000Z" });
    const res = await request(app)
      .put(`/projects/${p.project_id}`)
      .set("Authorization", bearer(ALICE))
      .send({ name: "New name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New name");
    expect(res.body.updated_at > "2026-01-01T00:00:00.000Z").toBe(true);
    expect(res.body.project_data).toEqual(p.project_data); // untouched
  });

  it("IT-29 cannot edit another user's project", async () => {
    const p = addProject({ user_id: BOB, name: "Bob's" });
    const res = await request(app)
      .put(`/projects/${p.project_id}`)
      .set("Authorization", bearer(ALICE))
      .send({ name: "Hacked" });
    expect(res.status).toBe(404);
    expect(state.tables.projects[0].name).toBe("Bob's");
  });
});

describe("DELETE /projects/:id", () => {
  it("IT-30 deletes the caller's project", async () => {
    const p = addProject({ user_id: ALICE });
    const res = await request(app).delete(`/projects/${p.project_id}`).set("Authorization", bearer(ALICE));
    expect(res.status).toBe(200);
    expect(state.tables.projects).toHaveLength(0);
  });

  it("IT-31 cannot delete another user's project", async () => {
    const p = addProject({ user_id: BOB });
    const res = await request(app).delete(`/projects/${p.project_id}`).set("Authorization", bearer(ALICE));
    expect(res.status).toBe(404);
    expect(state.tables.projects).toHaveLength(1);
  });
});

describe("POST /projects/:id/share", () => {
  it("IT-32 creates a 64-character share token and marks the project shared", async () => {
    const p = addProject({ user_id: ALICE });
    const res = await request(app)
      .post(`/projects/${p.project_id}/share`)
      .set("Authorization", bearer(ALICE));

    expect(res.status).toBe(200);
    expect(res.body.shareToken).toMatch(/^[0-9a-f]{64}$/);
    expect(state.tables.projects[0].is_shared).toBe(true);
  });

  it("IT-33 returns the same token when sharing again", async () => {
    const p = addProject({ user_id: ALICE });
    const first = await request(app).post(`/projects/${p.project_id}/share`).set("Authorization", bearer(ALICE));
    const second = await request(app).post(`/projects/${p.project_id}/share`).set("Authorization", bearer(ALICE));
    expect(second.body.shareToken).toBe(first.body.shareToken);
  });

  it("IT-34 cannot share another user's project", async () => {
    const p = addProject({ user_id: BOB });
    const res = await request(app).post(`/projects/${p.project_id}/share`).set("Authorization", bearer(ALICE));
    expect(res.status).toBe(404);
    expect(state.tables.projects[0].is_shared).toBe(false);
  });
});

/**
 * API tests: public read-only share links (FR-31).
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { reset, addProject } from "./fakeSupabase.js";

beforeEach(() => reset());

describe("GET /share/:token", () => {
  it("IT-35 returns a shared project without logging in, and no private fields", async () => {
    addProject({
      user_id: "11111111-1111-1111-1111-111111111111",
      name: "Shared half adder",
      tool_type: "logic",
      share_token: "a".repeat(64),
      is_shared: true,
    });

    const res = await request(app).get(`/share/${"a".repeat(64)}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Shared half adder");
    expect(res.body.tool_type).toBe("logic");
    expect(res.body.user_id).toBeUndefined();
    expect(res.body.project_id).toBeUndefined();
  });

  it("IT-36 returns 404 for a token that does not exist", async () => {
    const res = await request(app).get(`/share/${"b".repeat(64)}`);
    expect(res.status).toBe(404);
  });

  it("IT-37 returns 404 when the project is no longer shared", async () => {
    addProject({ share_token: "c".repeat(64), is_shared: false });
    const res = await request(app).get(`/share/${"c".repeat(64)}`);
    expect(res.status).toBe(404);
  });
});

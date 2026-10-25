/**
 * API tests: password reset (FR-04, finished in iteration 3).
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { reset, state, addAuthUser, issueRecoveryToken } from "./fakeSupabase.js";

beforeEach(() => reset());

describe("POST /auth/reset-password", () => {
  it("IT-09 sends the email with the configured reset page as the redirect", async () => {
    addAuthUser("me@example.com", "password1");
    const res = await request(app).post("/auth/reset-password").send({ email: "me@example.com" });

    expect(res.status).toBe(200);
    expect(state.resetEmails).toEqual([
      { email: "me@example.com", redirectTo: "https://www.eeroom.io/reset-password" },
    ]);
  });

  it("IT-10 answers an unknown email exactly like a known one", async () => {
    addAuthUser("me@example.com", "password1");
    const known = await request(app).post("/auth/reset-password").send({ email: "me@example.com" });
    const unknown = await request(app).post("/auth/reset-password").send({ email: "nobody@example.com" });

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
  });

  it("IT-11 rejects a request with no email", async () => {
    const res = await request(app).post("/auth/reset-password").send({});
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/update-password", () => {
  it("IT-12 changes the password for a valid recovery token, and the new one logs in", async () => {
    const user = addAuthUser("me@example.com", "old-password");
    const token = issueRecoveryToken(user.id);

    const res = await request(app)
      .post("/auth/update-password")
      .send({ accessToken: token, password: "new-password" });
    expect(res.status).toBe(200);

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "me@example.com", password: "new-password" });
    expect(login.status).toBe(200);
  });

  it("IT-13 refuses an invalid or expired token and changes nothing", async () => {
    const user = addAuthUser("me@example.com", "old-password");
    const res = await request(app)
      .post("/auth/update-password")
      .send({ accessToken: "not-a-real-token", password: "new-password" });

    expect(res.status).toBe(401);
    expect(state.authUsers.find((u) => u.id === user.id).password).toBe("old-password");
  });

  it("IT-14 refuses a password shorter than 8 characters", async () => {
    const user = addAuthUser("me@example.com", "old-password");
    const token = issueRecoveryToken(user.id);
    const res = await request(app)
      .post("/auth/update-password")
      .send({ accessToken: token, password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Password must be at least 8 characters.");
  });

  it("IT-15 refuses a request with no token", async () => {
    const res = await request(app).post("/auth/update-password").send({ password: "new-password" });
    expect(res.status).toBe(400);
  });
});

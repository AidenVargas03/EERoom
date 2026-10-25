/**
 * API tests: registration and login (FR-01, FR-03, FR-05).
 * Kept under 10 requests so the auth rate limiter is never reached here;
 * the limiter has its own file, rateLimit.test.js.
 */

import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app.js";
import { reset, state, addAuthUser } from "./fakeSupabase.js";

beforeEach(() => reset());

describe("POST /auth/register", () => {
  it("IT-01 creates the auth user and the matching users row", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "new@example.com", password: "password1", fullName: "New Student" });

    expect(res.status).toBe(201);
    expect(state.authUsers).toHaveLength(1);
    expect(state.tables.users).toHaveLength(1);
    expect(state.tables.users[0]).toMatchObject({
      user_id: state.authUsers[0].id,
      email: "new@example.com",
      full_name: "New Student",
    });
  });

  it("IT-02 rejects a request with no password", async () => {
    const res = await request(app).post("/auth/register").send({ email: "a@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Email and password are required.");
  });

  it("IT-03 rejects an email that is already registered", async () => {
    addAuthUser("taken@example.com", "password1");
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "taken@example.com", password: "password2" });
    expect(res.status).toBe(400);
    expect(state.authUsers).toHaveLength(1);
  });

  it("IT-04 rolls back the auth user when the users row cannot be written", async () => {
    state.failInsertInto = "users";
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "rollback@example.com", password: "password1" });

    expect(res.status).toBe(500);
    // Generic message only: no database details reach the browser.
    expect(res.body.error).toBe("Registration failed. Please try again.");
    // No orphaned account left behind, so the email can be used again.
    expect(state.authUsers).toHaveLength(0);
  });
});

describe("POST /auth/login", () => {
  it("IT-05 returns a 24-hour JWT carrying the user's id", async () => {
    const user = addAuthUser("me@example.com", "password1");
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "me@example.com", password: "password1" });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: user.id, email: "me@example.com" });

    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(user.id);
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
  });

  it("IT-06 gives the same vague message for a wrong password", async () => {
    addAuthUser("me@example.com", "password1");
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "me@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
    expect(res.body.token).toBeUndefined();
  });

  it("IT-07 gives the same vague message for an unknown email", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "password1" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password.");
  });

  it("IT-08 rejects a login with no email", async () => {
    const res = await request(app).post("/auth/login").send({ password: "password1" });
    expect(res.status).toBe(400);
  });
});

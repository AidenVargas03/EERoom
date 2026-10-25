/**
 * API tests: rate limiting on the public auth routes (NFR-13).
 * Security Design figure: 10 attempts per 15 minutes per address.
 */

import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("auth rate limiter", () => {
  it("IT-16 allows 10 login attempts, then blocks the 11th with 429", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "guess@example.com", password: `guess-${i}` });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post("/auth/login")
      .send({ email: "guess@example.com", password: "guess-10" });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/Too many attempts/);
  });

  it("IT-17 does not limit routes outside /auth", async () => {
    // The limiter above is now exhausted for this address.
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "eeroom-server" });
  });
});

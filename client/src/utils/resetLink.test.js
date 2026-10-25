import { describe, it, expect } from "vitest";
import { parseResetLink } from "./resetLink.js";

describe("parseResetLink", () => {
  it("returns the token from a valid recovery link", () => {
    const result = parseResetLink("#access_token=abc.def.ghi&expires_in=3600&type=recovery");
    expect(result).toEqual({ token: "abc.def.ghi", error: null });
  });

  it("accepts the hash without a leading #", () => {
    expect(parseResetLink("access_token=t1&type=recovery").token).toBe("t1");
  });

  it("rejects a token that is not a recovery token", () => {
    const result = parseResetLink("#access_token=t1&type=signup");
    expect(result.token).toBeNull();
    expect(result.error).toMatch(/password reset email/);
  });

  it("rejects a link with no token", () => {
    expect(parseResetLink("#type=recovery").token).toBeNull();
  });

  it("rejects an empty or missing hash", () => {
    expect(parseResetLink("").token).toBeNull();
    expect(parseResetLink(undefined).token).toBeNull();
  });

  it("reports Supabase's own message for an expired link", () => {
    const result = parseResetLink(
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired"
    );
    expect(result).toEqual({ token: null, error: "Email link is invalid or has expired" });
  });

  it("falls back to a generic message when the error has no description", () => {
    expect(parseResetLink("#error=access_denied").error).toBe(
      "This reset link is invalid or has expired."
    );
  });
});

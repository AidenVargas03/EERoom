// Vitest configuration for the server's API tests.
// Each test file runs in its own module scope (Vitest's default), so the
// auth rate limiter's request count starts at zero in every file.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
  },
});

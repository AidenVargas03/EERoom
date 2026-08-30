// vite.config.js
// Standard Vite + React setup. Source: Vite's official React template
// scaffold (`npm create vite@latest -- --template react`) -
// https://vitejs.dev/guide/#scaffolding-your-first-vite-project
// No modifications needed beyond the default plugin registration.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
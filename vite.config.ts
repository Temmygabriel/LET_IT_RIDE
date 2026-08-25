import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend is a thin client: it imports only the PURE, SDK-free parts of
// our shared engine (src/types.ts, src/rules.ts) so the exact same guardrail
// logic that the runner enforces also powers the on-screen preview — no drift.
// The heavy SDK stays server-side in the runner; the browser never bundles it.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "dist", sourcemap: true },
});

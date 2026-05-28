import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // server-only throws outside Next.js — stub it for vitest
      "server-only": path.resolve(__dirname, "lib/__test-stubs__/server-only.ts"),
      // Next.js path alias
      "@": path.resolve(__dirname),
    },
  },
});

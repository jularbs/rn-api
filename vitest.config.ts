import { defineConfig } from "vitest/config";
import path from "path";
import { config } from "dotenv";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Env Variables
    env: config({ path: ".env" }).parsed,

    // Setup files
    setupFiles: ["./src/tests/setup/mongoSetup.ts"],

    // File patterns
    include: ["src/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist"],

    // Coverage configuration
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "src/tests/", "**/*.d.ts", "**/*.config.*", "**/index.ts"],
    },

    // Test timeout
    testTimeout: 10000,

    // Mock reset between tests
    clearMocks: true,

    // Watch options
    watch: false,

    // Reporter
    reporters: ["verbose"],
  },

  // Resolve configuration to match TypeScript paths
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/models": path.resolve(__dirname, "./src/models"),
      "@/controllers": path.resolve(__dirname, "./src/controllers"),
      "@/middleware": path.resolve(__dirname, "./src/middleware"),
      "@/routes": path.resolve(__dirname, "./src/routes"),
      "@/config": path.resolve(__dirname, "./src/config"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
    },
  },
});

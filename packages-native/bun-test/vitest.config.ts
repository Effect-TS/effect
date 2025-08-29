import { defineConfig } from "vitest/config"

// Dummy Vitest config to satisfy root workspace runner.
// Bun tests are executed with Bun, not Vitest.
export default defineConfig({
  test: {
    include: ["vitest.dummy.test.ts"],
    threads: false,
  },
})

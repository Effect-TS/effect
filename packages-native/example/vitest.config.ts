import { defineConfig } from "vite"
import { vitest } from "../../vitest.shared"

export default defineConfig({
  test: vitest({ coverage: true })
})
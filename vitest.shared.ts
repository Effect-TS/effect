import type { ViteUserConfig } from "vitest/config"

const config: ViteUserConfig = {
  test: {
    include: ["test/**/*.test.ts"]
  }
}

export default config

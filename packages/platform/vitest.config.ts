import { mergeConfig, type UserConfigExport } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: UserConfigExport = {
  test: {
    coverage: {
      reporter: ["html"],
      include: ["src/OpenApi.ts"]
    }
  }
}

export default mergeConfig(shared, config)

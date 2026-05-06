import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = {
  test: {
    exclude: ["**/SqlPersistedQueue.test.ts"]
  }
}

export default mergeConfig(shared, config)

import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = {
  test: {
    setupFiles: ["vitest-websocket-mock"]
  }
}

export default mergeConfig(shared, config)

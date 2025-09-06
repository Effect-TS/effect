import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = {
  test: {
    // Integration tests need longer timeout for nix run commands
    testTimeout: 30000 // 30 seconds
  }
}

export default mergeConfig(shared, config)

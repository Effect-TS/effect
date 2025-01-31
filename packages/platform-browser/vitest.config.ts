import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = {
  test: {
    environment: "happy-dom"
  }
}

export default mergeConfig(shared, config)

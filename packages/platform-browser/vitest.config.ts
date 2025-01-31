import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: UserConfigExport = {
  test: {
    environment: "happy-dom"
  }
}

export default mergeConfig(shared, config)

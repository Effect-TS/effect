import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../../vitest.shared.ts"

const config: ViteUserConfig = {
  test: {
    testTimeout: 15_000
  }
}

export default mergeConfig(shared, config)

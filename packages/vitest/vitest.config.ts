import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.ts"

const config: ViteUserConfig = {
  esbuild: {
    target: "es2022"
  }
}

export default mergeConfig(shared, config)

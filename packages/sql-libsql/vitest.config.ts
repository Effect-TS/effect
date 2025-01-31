import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: ViteUserConfig = { test: { sequence: { concurrent: false } } }

export default mergeConfig(shared, config)

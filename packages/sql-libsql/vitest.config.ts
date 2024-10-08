import { mergeConfig, type UserConfigExport } from "vitest/config"
import shared from "../../vitest.shared.js"

const config: UserConfigExport = { test: { sequence: { concurrent: false } } }

export default mergeConfig(shared, config)

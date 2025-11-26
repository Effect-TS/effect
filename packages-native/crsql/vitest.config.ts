import { mergeConfig, type ViteUserConfig } from "vitest/config"
import shared from "../../vitest.shared.js"
// Simpler for tests: import the workspace source so Vite transforms TS.
// Using the published package export points at TS with ESM-style .js
// internals, which Node tries to resolve untransformed during config load
// and can trigger ERR_MODULE_NOT_FOUND (e.g., platform.js from index.ts).
import * as LibCrSql from "../libcrsql/src"

// Ensure CRSQLITE_PATH is available for tests by resolving via libcrsql.
// This avoids introducing a runtime dependency in the crsql library code.
// Fail-fast if resolution throws; surfaces missing/unsupported platforms.
process.env.CRSQLITE_PATH ??= LibCrSql.pathToCrSqliteExtension

const config: ViteUserConfig = {
  test: {
    // Integration tests need longer timeout for nix run commands
    testTimeout: 30000, // 30 seconds
    // Use forks pool for native module compatibility (crsqlite).
    // The default threads pool can cause "Channel closed" errors during
    // cleanup when native modules are loaded.
    pool: "forks"
  }
}

export default mergeConfig(shared, config)

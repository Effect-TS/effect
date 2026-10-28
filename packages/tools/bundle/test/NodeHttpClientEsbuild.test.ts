import { assert, describe, it } from "@effect/vitest"
import { bundledModules } from "./utils/esbuild.ts"

describe("node-http-client-form-data fixture bundled with esbuild", () => {
  // esbuild transpiles and Babel annotates every reachable workspace source module.
  it("does not include the undici package", { timeout: 20_000 }, async () => {
    const modules = await bundledModules("node-http-client-form-data.ts", { platform: "node" })
    assert.isTrue(modules.some((module) => module.endsWith("/platform/node/src/NodeHttpClient.ts")))
    const undiciModules = modules.filter((module) => /[\\/]node_modules[\\/]undici[\\/]/.test(module))
    assert.strictEqual(undiciModules.length, 0, `undici reached the Node HTTP client bundle`)
  })
})

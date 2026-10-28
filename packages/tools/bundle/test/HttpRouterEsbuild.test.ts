import { assert, describe, it } from "@effect/vitest"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { bundledModules } from "./utils/esbuild.ts"

const effectSrcDir = fileURLToPath(new URL("../../../effect/src/", import.meta.url))

// Bundles a fixture the way wrangler does (esbuild, worker conditions) and
// returns the effect source modules that made it into the output.
const bundledEffectModules = async (fixture: string): Promise<ReadonlyArray<string>> => {
  const modules = await bundledModules(fixture, {
    platform: "browser",
    conditions: ["workerd", "worker", "browser"]
  })
  return modules
    .map((module) => path.relative(effectSrcDir, module))
    .filter((module) => !module.startsWith(".."))
    .sort()
}

describe("http-router fixture bundled with esbuild", () => {
  // esbuild transpiles and Babel annotates every reachable Effect source module.
  // Under full-suite Bun CI load this can exceed Vitest's 5s default.
  it("does not include any Schema module", { timeout: 20_000 }, async () => {
    const modules = await bundledEffectModules("http-router.ts")
    assert.include(modules, "http/HttpRouter.ts")
    assert.include(modules, "http/HttpServerRespondable.ts")
    const schemaModules = modules.filter((module) =>
      /^(?:Schema[A-Za-z]*\.ts|schema\/|internal\/schema\/)/.test(module)
    )
    assert.deepStrictEqual(schemaModules, [], `Schema modules reached the router bundle: ${schemaModules.join(", ")}`)
  })
})

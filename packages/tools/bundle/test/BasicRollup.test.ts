import { assert, describe, it } from "@effect/vitest"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { rollup } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import { annotatePureCalls, effectSrcDir } from "./utils/annotatePureCalls.ts"

const fixturesDir = fileURLToPath(new URL("../fixtures/", import.meta.url))

// Bundles a fixture with Rollup, as the bundle size report does, and returns
// the effect source modules that contribute code to the output.
const bundledEffectModules = async (fixture: string): Promise<ReadonlyArray<string>> => {
  const bundle = await rollup({
    input: path.join(fixturesDir, fixture),
    plugins: [
      nodeResolve({ extensions: [".ts"] }),
      esbuild({ target: "es2022", format: "esm" }),
      {
        name: "annotate-pure-calls",
        transform(code, id) {
          return id.startsWith(effectSrcDir) ? annotatePureCalls(code, id) : null
        }
      }
    ],
    onwarn: () => {}
  })
  const { output } = await bundle.generate({ format: "esm" })
  await bundle.close()
  return Object.entries(output[0].modules)
    .filter(([id, module]) => id.startsWith(effectSrcDir) && module.renderedLength > 0)
    .map(([id]) => path.relative(effectSrcDir, id))
    .sort()
}

describe("basic fixture bundled with Rollup", () => {
  // Rollup transpiles and Babel annotates every module reachable from Effect.ts.
  it("runs an effect without structural equality or hashing", { timeout: 30_000 }, async () => {
    const modules = await bundledEffectModules("basic.ts")
    assert.include(modules, "internal/effect.ts")
    assert.include(modules, "internal/core.ts")
    for (const module of ["Equal.ts", "Hash.ts", "encoding/Hex.ts"]) {
      assert.notInclude(modules, module)
    }
  })
})

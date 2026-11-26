import { assert, describe, it } from "@effect/vitest"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { type OutputChunk, rollup } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import { annotatePureCalls, effectSrcDir } from "./utils/annotatePureCalls.ts"

// Bundles a file with Rollup, as the bundle size report does. Rollup transpiles
// and Babel annotates every module reachable from it, which takes a while.
const bundle = async (file: URL, format: "esm" | "iife"): Promise<OutputChunk> => {
  const build = await rollup({
    input: fileURLToPath(file),
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
  const { output } = await build.generate({ format, name: "bundle" })
  await build.close()
  return output[0]
}

describe("bundled with Rollup", () => {
  it("the basic fixture runs an effect without structural equality or hashing", { timeout: 30_000 }, async () => {
    const chunk = await bundle(new URL("../fixtures/basic.ts", import.meta.url), "esm")
    const modules = Object.entries(chunk.modules)
      .filter(([id, module]) => id.startsWith(effectSrcDir) && module.renderedLength > 0)
      .map(([id]) => path.relative(effectSrcDir, id))
    assert.include(modules, "internal/effect.ts")
    assert.include(modules, "internal/core.ts")
    for (const module of ["Equal.ts", "Hash.ts", "Effectable.ts", "encoding/Hex.ts"]) {
      assert.notInclude(modules, module)
    }
  })

  // Naming a protocol key is enough to keep the structural implementation
  it("protocol methods called by key are structural", { timeout: 30_000 }, async () => {
    const chunk = await bundle(new URL("./fixtures/protocol-keys.ts", import.meta.url), "iife")
    const exports = new Function(`${chunk.code}\nreturn bundle`)()
    assert.deepStrictEqual({ ...exports }, { equal: true, sameHash: true })
  })
})

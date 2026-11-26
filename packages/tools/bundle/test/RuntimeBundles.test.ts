import { assert, describe, it } from "@effect/vitest"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"
import * as esbuild from "esbuild"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { type OutputChunk, rollup } from "rollup"
import esbuildPlugin from "rollup-plugin-esbuild"
import { annotatePureCalls, annotatePureCallsPlugin, effectSrcDir } from "./utils/annotatePureCalls.ts"

// Bundles a file with Rollup, as the bundle size report does. Rollup transpiles
// and Babel annotates every module reachable from it, which takes a while.
const rollupBundle = async (file: URL, format: "esm" | "iife"): Promise<OutputChunk> => {
  const build = await rollup({
    input: fileURLToPath(file),
    plugins: [
      nodeResolve({ extensions: [".ts"] }),
      esbuildPlugin({ target: "es2022", format: "esm" }),
      {
        name: "annotate-pure-calls",
        transform(code, id) {
          return id.startsWith(effectSrcDir) ? annotatePureCalls(code, id) : null
        }
      },
      // @ts-expect-error see https://github.com/rollup/plugins/issues/1662
      ...(format === "iife" ? [terser()] : [])
    ],
    onwarn: () => {}
  })
  const { output } = await build.generate({ format, name: "bundle" })
  await build.close()
  return output[0]
}

// esbuild honours the `sideEffects` field of effect's package.json
const esbuildBundle = async (file: URL): Promise<string> => {
  const result = await esbuild.build({
    entryPoints: [fileURLToPath(file)],
    bundle: true,
    write: false,
    minify: true,
    format: "iife",
    globalName: "bundle",
    target: "es2022",
    logLevel: "silent",
    plugins: [annotatePureCallsPlugin]
  })
  return result.outputFiles[0].text
}

type Values = Record<string, Record<"~effect/Equal" | "~effect/Hash", (that?: unknown) => unknown>>
type Copy = { readonly make: (n: number) => Values }

// Each evaluation of a bundle is a separate copy of effect
const evaluate = (code: string): Copy => new Function(`${code}\nreturn bundle`)()

const assertProtocols = (self: Values, same: Values, other: Values, names: ReadonlyArray<string>) => {
  for (const name of names) {
    assert.isTrue(self[name]["~effect/Equal"](same[name]), name)
    assert.isFalse(self[name]["~effect/Equal"](other[name]), name)
    assert.strictEqual(self[name]["~effect/Hash"](), same[name]["~effect/Hash"](), name)
  }
}

const protocolKeys = new URL("./fixtures/protocol-keys.ts", import.meta.url)

describe("bundled", () => {
  it("the basic fixture leaves out Effectable and Hex", { timeout: 30_000 }, async () => {
    const chunk = await rollupBundle(new URL("../fixtures/basic.ts", import.meta.url), "esm")
    const modules = Object.entries(chunk.modules)
      .filter(([id, module]) => id.startsWith(effectSrcDir) && module.renderedLength > 0)
      .map(([id]) => path.relative(effectSrcDir, id))
    assert.include(modules, "internal/effect.ts")
    assert.include(modules, "internal/core.ts")
    for (const module of ["Effectable.ts", "encoding/Hex.ts"]) {
      assert.notInclude(modules, module)
    }
  })

  for (
    const [bundler, bundle] of [
      ["Rollup", async () => (await rollupBundle(protocolKeys, "iife")).code],
      ["esbuild", () => esbuildBundle(protocolKeys)]
    ] as const
  ) {
    it(`${bundler}: runtime data types compare by protocol key, within and across copies`, {
      timeout: 30_000
    }, async () => {
      const code = await bundle()
      const a = evaluate(code)
      const b = evaluate(code)
      assertProtocols(a.make(1), a.make(1), a.make(2), ["exit", "fail", "interrupt", "context"])
      // Interrupt compares annotations by reference, and each copy has its own
      // empty annotations
      assertProtocols(a.make(1), b.make(1), b.make(2), ["exit", "fail", "context"])
    })
  }
})

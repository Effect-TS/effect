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
const rollupBundle = async (file: URL, format: "esm" | "iife", minify: boolean): Promise<OutputChunk> => {
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
      ...(minify ? [terser()] : [])
    ],
    onwarn: () => {}
  })
  const { output } = await build.generate({ format, name: "bundle" })
  await build.close()
  return output[0]
}

const resolving = Symbol()

// Marks every effect module as free of side effects, the strictest setting a
// bundler can apply: a module is kept only for the bindings that are used.
const sideEffectsFreePlugin: esbuild.Plugin = {
  name: "side-effects-free",
  setup(build) {
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData === resolving) return undefined
      const { errors: _, warnings: __, ...result } = await build.resolve(args.path, {
        kind: args.kind,
        importer: args.importer,
        resolveDir: args.resolveDir,
        pluginData: resolving
      })
      return result.path.startsWith(effectSrcDir) ? { ...result, sideEffects: false } : result
    })
  }
}

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
    plugins: [sideEffectsFreePlugin, annotatePureCallsPlugin]
  })
  return result.outputFiles[0].text
}

type Values = Record<
  string,
  Record<"~effect/Equal" | "~effect/Hash", (that?: unknown) => unknown> & { toString(): string }
>
type Copy = { readonly make: (n: number) => Values }

// Each evaluation of a bundle is a separate copy of effect
const evaluate = (code: string): Copy => new Function(`${code}\nreturn bundle`)()

const assertProtocols = (self: Values, same: Values, other: Values, names: ReadonlyArray<string>) => {
  for (const name of names) {
    assert.isTrue(self[name]["~effect/Equal"](same[name]), name)
    assert.isFalse(self[name]["~effect/Equal"](other[name]), name)
    assert.strictEqual(self[name]["~effect/Hash"](), same[name]["~effect/Hash"](), name)
    assert.strictEqual(self[name].toString(), same[name].toString(), name)
  }
}

const protocolKeys = new URL("./fixtures/protocol-keys.ts", import.meta.url)

describe("bundled", () => {
  it("the basic fixture contains only the modules running an effect needs", { timeout: 30_000 }, async () => {
    const chunk = await rollupBundle(new URL("../fixtures/basic.ts", import.meta.url), "esm", true)
    const rendered = Object.entries(chunk.modules)
      .filter(([id, module]) => id.startsWith(effectSrcDir) && module.renderedLength > 0)
    // A module joining this list needs a reason to be in every program
    assert.deepStrictEqual(rendered.map(([id]) => path.relative(effectSrcDir, id)).sort(), [
      "Context.ts",
      "Effect.ts",
      "Equal.ts",
      "Formatter.ts",
      "Function.ts",
      "Hash.ts",
      "Inspectable.ts",
      "Pipeable.ts",
      "Redactable.ts",
      "Utils.ts",
      "internal/core.ts",
      "internal/effect.ts",
      "internal/equal.ts",
      "internal/fiberCachedKeys.ts",
      "internal/predicate.ts",
      "internal/scheduler.ts"
    ])
    // The runtime calls the data-first forms of dual APIs and stays on flat contexts
    const [, functionModule] = rendered.find(([id]) => path.relative(effectSrcDir, id) === "Function.ts")!
    assert.notInclude(functionModule.renderedExports, "dual")
    const [, contextModule] = rendered.find(([id]) => path.relative(effectSrcDir, id) === "Context.ts")!
    assert.notInclude(contextModule.renderedExports, "addUnsafe")
  })

  for (
    const [bundler, bundle] of [
      ["Rollup", async () => (await rollupBundle(protocolKeys, "iife", false)).code],
      ["minified Rollup", async () => (await rollupBundle(protocolKeys, "iife", true)).code],
      ["esbuild with sideEffects: false", () => esbuildBundle(protocolKeys)]
    ] as const
  ) {
    it(`${bundler}: runtime data types compare by protocol key, within and across copies`, {
      timeout: 30_000
    }, async () => {
      const code = await bundle()
      const a = evaluate(code)
      const b = evaluate(code)
      assertProtocols(a.make(1), a.make(1), a.make(2), ["exit", "fail", "die", "interrupt", "context"])
      // Interrupt compares annotations by reference, and each copy has its own
      // empty annotations
      assertProtocols(a.make(1), b.make(1), b.make(2), ["exit", "fail", "die", "context"])
    })
  }
})

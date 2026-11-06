/**
 * The bundle regression test for tree-shakeable services: a root that calls
 * two of `effect/FileSystem`'s operations and provides two implementations
 * read off a provider module of three bundles those two and nothing else,
 * with `effect` and the provider module bundled as they are published.
 *
 * "As published": the package build runs `babel-plugin-annotate-pure-calls`
 * over `dist`, which marks every top-level call pure, so a bundler drops the
 * keys, layers and services a program does not reference, including the
 * unused exports of a module it keeps. The test applies the same transform to
 * `packages/effect/src` and to the fixture's provider module in an esbuild
 * `onLoad` plugin. One more bundle leaves the provider module as written, to
 * pin what the annotation buys: without it, an unused `Layer.succeed(…)` at
 * the top level of a kept module is a side effect, and its implementation
 * stays.
 */
import * as babel from "@babel/core"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as esbuild from "esbuild"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const fixtures = fileURLToPath(new URL("../fixtures/tree-shaking/", import.meta.url))
const provider = path.join(fixtures, "NodeFileSystem.ts")
const source = fileURLToPath(new URL("../../src/", import.meta.url))
const streamModules = ["Stream.ts", "Channel.ts", "Sink.ts", "internal/stream.ts", "internal/channel.ts"]

const publish = async (file: string): Promise<string> => {
  const js = await esbuild.transform(fs.readFileSync(file, "utf8"), { loader: "ts", format: "esm", target: "es2022" })
  const result = await babel.transformAsync(js.code, {
    babelrc: false,
    configFile: false,
    compact: false,
    plugins: ["babel-plugin-annotate-pure-calls"]
  })
  return result!.code!
}

const bundle = (options: { readonly provider: "published" | "as written" }) =>
  Effect.promise(async () => {
    const result = await esbuild.build({
      entryPoints: [path.join(fixtures, "main.ts")],
      bundle: true,
      format: "esm",
      platform: "node",
      target: "es2022",
      treeShaking: true,
      write: false,
      metafile: true,
      logLevel: "silent",
      plugins: [{
        name: "as-published",
        setup(build) {
          build.onLoad({ filter: /\.ts$/ }, async (args) =>
            args.path.startsWith(source) || (options.provider === "published" && args.path === provider)
              ? { contents: await publish(args.path), loader: "js", resolveDir: path.dirname(args.path) }
              : undefined)
        }
      }]
    })
    const text = result.outputFiles[0].text
    const output = Object.values(result.metafile.outputs)[0]
    const bytesOf = (suffix: string) =>
      Object.entries(output.inputs)
        .filter(([file]) =>
          file.endsWith(suffix)
        )
        .reduce((total, [, input]) => total + input.bytesInOutput, 0)
    const streamBytes = streamModules.reduce((total, module) => total + bytesOf(`packages/effect/src/${module}`), 0)
    return { text, bytes: output.bytes, streamBytes, providerBytes: bytesOf("tree-shaking/NodeFileSystem.ts") }
  }).pipe(Effect.cached, Effect.runSync)

const published = bundle({ provider: "published" })
const asWritten = bundle({ provider: "as written" })

describe("tree-shakeable services: the bundle", () => {
  it.effect(
    "contains the two implementations the root provides and not the third, out of one provider module",
    () =>
      Effect.gen(function*() {
        const { providerBytes, text } = yield* published
        assert.include(text, "fixture/FileSystem/readFile")
        assert.include(text, "fixture/FileSystem/writeFile")
        assert.notInclude(text, "fixture/FileSystem/stat")
        // the module is in the bundle, but only the two exports the root reads survive of it
        assert.isAbove(providerBytes, 0)
        const { providerBytes: whole } = yield* asWritten
        assert.isBelow(providerBytes, whole / 2)
      }),
    60_000
  )

  it.effect("keeps the two keys the program references and drops the other thirty", () =>
    Effect.gen(function*() {
      const { text } = yield* published
      assert.include(text, "\"effect/FileSystem/readFile\"")
      assert.include(text, "\"effect/FileSystem/writeFile\"")
      assert.notInclude(text, "\"effect/FileSystem/stat\"")
      assert.notInclude(text, "\"effect/FileSystem/stream\"")
      // the record service is not referenced either
      assert.notInclude(text, "\"effect/FileSystem\"")
    }), 60_000)

  it.effect("carries none of the Stream runtime", () =>
    Effect.gen(function*() {
      const { streamBytes } = yield* published
      assert.strictEqual(streamBytes, 0)
    }), 60_000)

  it.effect("runs", () =>
    Effect.gen(function*() {
      const { text } = yield* published
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tree-shaking-"))
      try {
        const script = path.join(directory, "main.mjs")
        const file = path.join(directory, "input.txt")
        fs.writeFileSync(script, text)
        fs.writeFileSync(file, "shaken")
        const run = spawnSync(process.execPath, [script, file], { encoding: "utf8" })
        assert.strictEqual(run.status, 0, run.stderr)
        assert.include(run.stdout, "backed up 6 bytes")
        assert.strictEqual(fs.readFileSync(`${file}.bak`, "utf8"), "shaken")
      } finally {
        fs.rmSync(directory, { recursive: true, force: true })
      }
    }), 60_000)

  it.effect(
    "keeps the third implementation when the provider module is bundled as written, unannotated",
    () =>
      Effect.gen(function*() {
        // What the build's annotation buys: the same root, the same module, no `#__PURE__` on its top-level calls.
        const { text } = yield* asWritten
        assert.include(text, "fixture/FileSystem/readFile")
        assert.include(text, "fixture/FileSystem/writeFile")
        assert.include(text, "fixture/FileSystem/stat")
      }),
    60_000
  )
})

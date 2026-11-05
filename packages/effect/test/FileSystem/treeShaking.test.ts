/**
 * The bundle regression test for tree-shakeable services: a root that calls
 * two of `effect/FileSystem`'s operations and provides two implementations off
 * a namespace of three bundles those two and nothing else, with `effect`
 * bundled as it is published.
 *
 * "As published": the package build runs `babel-plugin-annotate-pure-calls`
 * over `dist`, which marks every top-level call pure, so a bundler drops the
 * keys, layers and services a program does not reference. The test applies
 * the same transform to `packages/effect/src` in an esbuild `onLoad` plugin.
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

const bundle = Effect.promise(async () => {
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
      name: "effect-as-published",
      setup(build) {
        build.onLoad({ filter: /\.ts$/ }, async (args) =>
          args.path.startsWith(source)
            ? { contents: await publish(args.path), loader: "js", resolveDir: path.dirname(args.path) }
            : undefined)
      }
    }]
  })
  const text = result.outputFiles[0].text
  const output = Object.values(result.metafile.outputs)[0]
  const streamBytes = Object.entries(output.inputs)
    .filter(([file]) => streamModules.some((module) => file.endsWith(`packages/effect/src/${module}`)))
    .reduce((total, [, input]) => total + input.bytesInOutput, 0)
  return { text, bytes: output.bytes, streamBytes }
}).pipe(Effect.cached, Effect.runSync)

describe("tree-shakeable services: the bundle", () => {
  it.effect("contains the two implementations the root provides and not the third", () =>
    Effect.gen(function*() {
      const { text } = yield* bundle
      assert.include(text, "fixture/FileSystem/readFile")
      assert.include(text, "fixture/FileSystem/writeFile")
      assert.notInclude(text, "fixture/FileSystem/stat")
    }), 60_000)

  it.effect("keeps the two keys the program references and drops the other thirty", () =>
    Effect.gen(function*() {
      const { text } = yield* bundle
      assert.include(text, "\"effect/FileSystem/readFile\"")
      assert.include(text, "\"effect/FileSystem/writeFile\"")
      assert.notInclude(text, "\"effect/FileSystem/stat\"")
      assert.notInclude(text, "\"effect/FileSystem/stream\"")
      // the record service is not referenced either
      assert.notInclude(text, "\"effect/FileSystem\"")
    }), 60_000)

  it.effect("carries none of the Stream runtime", () =>
    Effect.gen(function*() {
      const { streamBytes } = yield* bundle
      assert.strictEqual(streamBytes, 0)
    }), 60_000)

  it.effect("runs", () =>
    Effect.gen(function*() {
      const { text } = yield* bundle
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
})

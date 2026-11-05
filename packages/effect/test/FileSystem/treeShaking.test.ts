/**
 * The bundle regression test for tree-shakeable services: a root that calls
 * two of `effect/FileSystem`'s operations and provides two implementations off
 * a namespace of three bundles those two and nothing else, with `effect`
 * bundled as it is published. The same program provided with the real
 * `NodeFileSystem.readFile` and `NodeFileSystem.writeFile` of
 * `@effect/platform-node-shared` bundles two of its thirty-two implementation
 * modules; provided with `NodeFileSystem.layer`, all of them.
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
const nodeShared = fileURLToPath(new URL("../../../platform/node-shared/src/", import.meta.url))
const fileSystemModules = path.join(nodeShared, "internal", "fileSystem", path.sep)
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

const build = (entry: string, options?: { readonly minify?: boolean }) =>
  Effect.promise(async () => {
    const result = await esbuild.build({
      entryPoints: [path.join(fixtures, entry)],
      bundle: true,
      format: "esm",
      platform: "node",
      target: "es2022",
      treeShaking: true,
      minify: options?.minify ?? false,
      write: false,
      metafile: true,
      absWorkingDir: fixtures,
      logLevel: "silent",
      plugins: [{
        name: "effect-as-published",
        setup(build) {
          // the published package has `"sideEffects": []`, as its source does
          build.onResolve({ filter: /^@effect\/platform-node-shared\// }, (args) => ({
            path: path.join(nodeShared, `${args.path.slice("@effect/platform-node-shared/".length)}.ts`),
            sideEffects: false
          }))
          build.onLoad({ filter: /\.ts$/ }, async (args) =>
            args.path.startsWith(source) || args.path.startsWith(nodeShared)
              ? { contents: await publish(args.path), loader: "js", resolveDir: path.dirname(args.path) }
              : undefined)
        }
      }]
    })
    const text = result.outputFiles[0].text
    const output = Object.values(result.metafile.outputs)[0]
    // metafile paths are relative to `absWorkingDir`
    const inputs = Object.entries(output.inputs)
      .filter(([, input]) =>
        input.bytesInOutput > 0
      )
      .map(([file, input]) => [path.resolve(fixtures, file), input.bytesInOutput] as const)
    const streamBytes = inputs
      .filter(([file]) => streamModules.some((module) => file === path.join(source, module)))
      .reduce((total, [, bytes]) => total + bytes, 0)
    // the Node implementation modules in the bundle, by operation name
    const operations = inputs
      .filter(([file]) => file.startsWith(fileSystemModules))
      .map(([file]) => path.basename(file, ".ts"))
      .sort()
    return { text, bytes: output.bytes, streamBytes, operations }
  })

const bundle = build("main.ts").pipe(Effect.cached, Effect.runSync)

// runs a bundle of `backup` over a temporary file
const runBackup = (text: string) =>
  Effect.sync(() => {
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
  })

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

  it.effect("runs", () => Effect.flatMap(bundle, ({ text }) => runBackup(text)), 60_000)
})
const operations = [
  "access",
  "chmod",
  "chown",
  "copy",
  "copyFile",
  "exists",
  "glob",
  "link",
  "lstat",
  "makeDirectory",
  "makeTempDirectory",
  "makeTempDirectoryScoped",
  "makeTempFile",
  "makeTempFileScoped",
  "open",
  "readDirectory",
  "readDirectoryEntries",
  "readFile",
  "readFileString",
  "readLink",
  "realPath",
  "remove",
  "rename",
  "sink",
  "stat",
  "stream",
  "symlink",
  "truncate",
  "utimes",
  "watch",
  "writeFile",
  "writeFileString"
]

const bundleNode = (entry: string) =>
  Effect.all({ bundle: build(entry), minified: build(entry, { minify: true }) }).pipe(Effect.cached, Effect.runSync)

// `backup` provided with `NodeFileSystem.readFile` and `NodeFileSystem.writeFile`
const nodeOperations = bundleNode("main-node.ts")
// `backup` provided with `NodeFileSystem.layer`
const nodeLayer = bundleNode("main-node-layer.ts")

describe("tree-shakeable services: the bundle over @effect/platform-node-shared", () => {
  it.effect(
    "contains the two Node implementations the root provides and none of the other thirty",
    () =>
      Effect.gen(function*() {
        const { bundle: { operations: included, text } } = yield* nodeOperations
        // `shared` holds the error mapping and the `writeFile` implementation
        assert.deepStrictEqual(included, ["readFile", "shared", "writeFile"])
        assert.include(text, "\"readFile\"")
        assert.include(text, "\"writeFile\"")
        for (
          const method of ["stat", "lstat", "open", "access", "makeTempDirectory", "readDirectoryEntries", "watch"]
        ) {
          assert.notInclude(text, `"${method}"`, method)
        }
      }),
    60_000
  )

  it.effect("keeps the two keys the program references and drops the others", () =>
    Effect.gen(function*() {
      const { bundle: { text } } = yield* nodeOperations
      assert.include(text, "\"effect/FileSystem/readFile\"")
      assert.include(text, "\"effect/FileSystem/writeFile\"")
      for (const operation of operations.filter((operation) => operation !== "readFile" && operation !== "writeFile")) {
        assert.notInclude(text, `"effect/FileSystem/${operation}"`, operation)
      }
      assert.notInclude(text, "\"effect/FileSystem\"")
    }), 60_000)

  it.effect("carries none of the Stream runtime", () =>
    Effect.gen(function*() {
      const { bundle, minified } = yield* nodeOperations
      assert.strictEqual(bundle.streamBytes, 0)
      assert.strictEqual(minified.streamBytes, 0)
    }), 60_000)

  it.effect("runs", () => Effect.flatMap(nodeOperations, ({ bundle }) => runBackup(bundle.text)), 60_000)

  it.effect("the aggregate layer bundles every implementation, and runs", () =>
    Effect.gen(function*() {
      const { bundle } = yield* nodeLayer
      assert.deepStrictEqual(bundle.operations, [...operations, "layer", "shared"].sort())
      for (const operation of operations) {
        assert.include(bundle.text, `"effect/FileSystem/${operation}"`, operation)
      }
      assert.isAbove(bundle.streamBytes, 0)
      yield* runBackup(bundle.text)
    }), 60_000)

  it.effect("the two-operation root is smaller than the aggregate", () =>
    Effect.gen(function*() {
      const two = yield* nodeOperations
      const all = yield* nodeLayer
      // minified, at the time of writing: 39,939 bytes against 76,829
      assert.isBelow(two.minified.bytes, all.minified.bytes * 0.6)
    }), 60_000)
})

/**
 * The bundle regression test for tree-shakeable services: a root provided
 * with only the `NodeFileSystem` operation layers its program requires
 * bundles those implementation modules of `@effect/platform-node-shared` and
 * none of the other thirty-two, with `effect` bundled as it is published.
 *
 * "As published": the package build runs `babel-plugin-annotate-pure-calls`
 * over `dist`, which marks every top-level call pure, so a bundler drops the
 * keys, layers and services a program does not reference. The test applies
 * the same transform in an esbuild `onLoad` plugin, once per module.
 */
import * as babel from "@babel/core"
import { assert, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const fixtures = fileURLToPath(new URL("../fixtures/tree-shaking/", import.meta.url))
const source = fileURLToPath(new URL("../../src/", import.meta.url))
const nodeShared = fileURLToPath(new URL("../../../platform/node-shared/src/", import.meta.url))
const fileSystemModules = path.join(nodeShared, "internal", "fileSystem", path.sep)
const streamModules = ["Stream.ts", "Channel.ts", "Sink.ts", "internal/stream.ts", "internal/channel.ts"]
  .map((file) => path.join(source, file))

const published = new Map<string, Promise<string>>()
const publish = (file: string) => {
  let code = published.get(file)
  if (code === undefined) {
    code = esbuild.transform(fs.readFileSync(file, "utf8"), { loader: "ts", format: "esm", target: "es2022" })
      .then((js) =>
        babel.transformAsync(js.code, {
          babelrc: false,
          configFile: false,
          plugins: ["babel-plugin-annotate-pure-calls"]
        })
      )
      .then((result) => result!.code!)
    published.set(file, code)
  }
  return code
}

// one build of every fixture
const bundles = esbuild.build({
  entryPoints: ["main-node.ts", "main-http-file.ts", "main-logger-file.ts"].map((entry) => path.join(fixtures, entry)),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  write: false,
  outdir: path.join(fixtures, "dist"),
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
}).then((result) =>
  Object.fromEntries(
    Object.entries(result.metafile.outputs).map(([output, { entryPoint, inputs }]) => {
      const present = Object.entries(inputs)
        .filter(([, input]) => input.bytesInOutput > 0)
        .map(([file, input]) => [path.resolve(fixtures, file), input.bytesInOutput] as const)
      return [path.basename(entryPoint!), {
        text: result.outputFiles.find((file) => file.path === path.resolve(fixtures, output))!.text,
        // the Node implementation modules in the bundle, by operation name
        operations: present.filter(([file]) => file.startsWith(fileSystemModules)).map(([file]) =>
          path.basename(file, ".ts")
        ).sort(),
        streamBytes: present.filter(([file]) => streamModules.includes(file)).reduce((total, [, n]) => total + n, 0)
      }]
    })
  )
)

const assertKeys = (text: string, used: ReadonlyArray<string>) => {
  const keys = [...text.matchAll(/"effect\/FileSystem\/(\w+)"/g)].map(([, name]) => name)
  assert.deepStrictEqual([...new Set(keys)].sort(), [...used].sort())
  // the record service is not referenced
  assert.notInclude(text, "\"effect/FileSystem\"")
}

describe("tree-shakeable services: the bundle", () => {
  it("readFile and writeFile: two of the thirty-two Node implementations, no Stream runtime", async () => {
    const { operations, streamBytes, text } = (await bundles)["main-node.ts"]
    // `shared` holds the error mapping and the `writeFile` implementation
    assert.deepStrictEqual(operations, ["readFile", "shared", "writeFile"])
    assertKeys(text, ["readFile", "writeFile"])
    assert.strictEqual(streamBytes, 0)
  }, 60_000)

  it("HttpServerResponse.file: stat and stream, over open", async () => {
    const { operations, text } = (await bundles)["main-http-file.ts"]
    // `NodeFileSystem.stream` is `FileSystem.layerStream` over `NodeFileSystem.open`
    assert.deepStrictEqual(operations, ["open", "shared", "stat", "stream"])
    assertKeys(text, ["open", "stat", "stream"])
  }, 60_000)

  it("Logger.toFile: open alone, no Stream runtime", async () => {
    const { operations, streamBytes, text } = (await bundles)["main-logger-file.ts"]
    assert.deepStrictEqual(operations, ["open", "shared"])
    assertKeys(text, ["open"])
    assert.strictEqual(streamBytes, 0)
  }, 60_000)
})

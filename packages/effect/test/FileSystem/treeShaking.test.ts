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
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const fixtures = fileURLToPath(new URL("../fixtures/tree-shaking/", import.meta.url))
const source = fileURLToPath(new URL("../../src/", import.meta.url))
const nodeShared = fileURLToPath(new URL("../../../platform/node-shared/src/", import.meta.url))
const fileSystemModules = path.join(nodeShared, "internal", "fileSystem", path.sep)
const terminalModules = path.join(nodeShared, "internal", "terminal", path.sep)
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
  entryPoints: [
    "main-node.ts",
    "main-http-file.ts",
    "main-logger-file.ts",
    "main-terminal.ts",
    "main-receiver.ts",
    "main-cli.ts"
  ].map((
    entry
  ) => path.join(fixtures, entry)),
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
        // the Node terminal modules in the bundle, by member name
        terminal: present.filter(([file]) => file.startsWith(terminalModules)).map(([file]) =>
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

  it("Terminal.display: display alone, no readline", async () => {
    const { streamBytes, terminal, text } = (await bundles)["main-terminal.ts"]
    assert.deepStrictEqual(terminal, ["display"])
    for (const name of ["readline", "emitKeypressEvents", "setRawMode"]) {
      assert.notInclude(text, name)
    }
    const keys = [...text.matchAll(/"effect\/Terminal\/(\w+)"/g)].map(([, name]) => name)
    assert.deepStrictEqual([...new Set(keys)], ["display"])
    // the record service is not referenced
    assert.notInclude(text, "\"effect/Terminal\"")
    assert.strictEqual(streamBytes, 0)
  }, 60_000)

  it("the receiver: one rule from a bundled namespace call, a destructured member and Effect.andThen", async () => {
    const { text } = (await bundles)["main-receiver.ts"]
    // the namespace call `Users.create("x")` is a bare call in the bundle
    assert.notMatch(text, /\.create\("x"\)/)
    assert.match(text, /\bcreate\("x"\)/)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "effect-receiver-"))
    try {
      fs.writeFileSync(path.join(dir, "main.mjs"), text)
      const results = JSON.parse(execFileSync(process.execPath, [path.join(dir, "main.mjs")], { encoding: "utf8" }))
      const live = "created live x"
      const fake = "created fake x"
      // per implementation, three call sites, each without and with an override of `find`: `this.find` is the
      // providing object's own, for a plain object and a class instance alike; `Users.find` sees the override
      assert.deepStrictEqual(results, [
        ...Array(6).fill(live),
        ...Array(6).fill(live),
        live,
        fake,
        live,
        fake,
        live,
        fake
      ])
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }, 60_000)

  it("Command.run: no file system, three terminal members", async () => {
    const { operations, terminal, text } = (await bundles)["main-cli.ts"]
    assert.deepStrictEqual(operations, [])
    assert.notInclude(text, "\"effect/FileSystem/")
    // `input` is the key reader of `readInput`
    assert.deepStrictEqual(terminal, ["columns", "display", "input", "readInput"])
    const keys = [...text.matchAll(/"effect\/Terminal\/(\w+)"/g)].map(([, name]) => name)
    // the three operations, and the `Terminal.Interactive` record the prompts read them through
    assert.deepStrictEqual([...new Set(keys)].sort(), ["Interactive", "columns", "display", "readInput"])
    // the full terminal record service is not referenced
    assert.notInclude(text, "\"effect/Terminal\"")
  }, 60_000)
})

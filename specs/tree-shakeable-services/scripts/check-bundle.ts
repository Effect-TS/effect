/**
 * The bundle check: bundles the composition roots and reports which
 * operation implementations, and which parts of the `effect` runtime, each
 * bundle contains.
 *
 *   pnpm bundle
 *
 * Each root has an expectation: the implementations it must contain, and
 * whether the Stream runtime may appear. The check fails if an
 * implementation the program does not use ends up in a bundle, if one it
 * does use is missing, or if a root that uses only Effect operations pulls
 * in a Stream module. It then runs three of the bundles to show that they
 * work.
 *
 * Evidence is collected two ways, so neither depends on the other:
 *
 * - the bundler's metafile lists every input module of each bundle, so the
 *   `src/node/<op>.ts` modules present are the implementations present, and
 *   the `packages/effect/src/*` modules present are the runtime present;
 * - every file system implementation tags its errors with a
 *   `node/FileSystem/<op>` string, so the bundle text is also scanned for
 *   those markers.
 *
 * The last group of roots is the annotation matrix: the two-operation root
 * bundled with the contract's `@__PURE__` annotations stripped, by esbuild as
 * is, by esbuild after `babel-plugin-annotate-pure-calls` (what the published
 * `effect` build does), and by Rolldown, which reads the constructors'
 * `@__NO_SIDE_EFFECTS__` annotation across modules.
 */
import * as babel from "@babel/core"
import * as esbuild from "esbuild"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { rolldown } from "rolldown"

const root = path.resolve(import.meta.dirname, "..")
const outdir = path.join(root, "dist")
const operations = fs.readdirSync(path.join(root, "src", "node"))
  .filter((file) => file.endsWith(".ts") && !["index.ts", "internal.ts", "layer.ts"].includes(file))
  .map((file) => file.slice(0, -3))
  .sort()
const terminalOperations = fs.readdirSync(path.join(root, "src", "node", "terminal"))
  .filter((file) => file.endsWith(".ts") && !["index.ts", "layer.ts"].includes(file))
  .map((file) => file.slice(0, -3))
  .sort()

const twenty = [
  "access",
  "copy",
  "copyFile",
  "exists",
  "lstat",
  "makeDirectory",
  "makeTempDirectory",
  "readDirectory",
  "readDirectoryEntries",
  "readFile",
  "readFileString",
  "realPath",
  "remove",
  "rename",
  "stat",
  "symlink",
  "truncate",
  "utimes",
  "writeFile",
  "writeFileString"
]

type Contract = "annotated" | "unannotated" | "unannotated+babel"
type Bundler = "esbuild" | "rolldown"

interface Root {
  readonly entry: string
  readonly label: string
  readonly uses: ReadonlyArray<string>
  readonly terminal?: ReadonlyArray<string>
  readonly streamRuntime: "absent" | "present"
  readonly contract?: Contract
  readonly bundler?: Bundler
}

const roots: ReadonlyArray<Root> = [
  { entry: "main.ts", label: "two operation layers", uses: ["readFile", "writeFile"], streamRuntime: "absent" },
  {
    entry: "main-namespace.ts",
    label: "two layers off a namespace",
    uses: ["readFile", "writeFile"],
    streamRuntime: "absent"
  },
  {
    entry: "main-readonly.ts",
    label: "ReadOnly subset, three member layers",
    uses: ["exists", "readFile", "stat"],
    streamRuntime: "absent"
  },
  { entry: "main-stream.ts", label: "one Stream operation", uses: ["stream"], streamRuntime: "present" },
  { entry: "main-twenty.ts", label: "twenty operation layers", uses: twenty, streamRuntime: "absent" },
  { entry: "main-record.ts", label: "yield* FileSystem, record layer", uses: operations, streamRuntime: "present" },
  { entry: "main-full.ts", label: "two operations, record layer", uses: operations, streamRuntime: "present" },
  {
    entry: "main-terminal.ts",
    label: "two terminal layers, one value-shaped",
    uses: [],
    terminal: ["columns", "display"],
    streamRuntime: "absent"
  },
  // The annotation matrix: the same two-operation root with the contract's `@__PURE__` comments removed.
  {
    entry: "main.ts",
    label: "unannotated contract, esbuild",
    uses: ["readFile", "writeFile"],
    streamRuntime: "present",
    contract: "unannotated"
  },
  {
    entry: "main.ts",
    label: "unannotated contract, esbuild, babel annotate-pure-calls",
    uses: ["readFile", "writeFile"],
    streamRuntime: "absent",
    contract: "unannotated+babel"
  },
  // Rolldown reads `@__NO_SIDE_EFFECTS__` across modules and drops the unused keys, but keeps the modules the
  // dropped statements imported: the Stream runtime stays. Only call-site annotations free it, as the next root shows.
  {
    entry: "main.ts",
    label: "unannotated contract, rolldown",
    uses: ["readFile", "writeFile"],
    streamRuntime: "present",
    contract: "unannotated",
    bundler: "rolldown"
  },
  {
    entry: "main.ts",
    label: "annotated contract, rolldown",
    uses: ["readFile", "writeFile"],
    streamRuntime: "absent",
    contract: "annotated",
    bundler: "rolldown"
  }
]

// The modules of the Stream runtime. A bundle that uses no Stream operation must contain none of them.
// (`Pull.ts` is not in the list: `Queue.ts` and `Schedule.ts` import it, so every root carries it.)
const streamModules = ["Stream.ts", "Channel.ts", "Sink.ts", "internal/stream.ts", "internal/channel.ts"]

interface Bundle {
  readonly root: Root
  readonly bytes: number
  readonly text: string
  readonly modules: ReadonlyArray<string>
  readonly effectModules: ReadonlyArray<string>
  readonly output: string
}

const contracts = [path.join(root, "src", "FileSystem.ts"), path.join(root, "src", "Terminal.ts")]

// Loads a contract module as the root asks for it: as written, with the annotations stripped, or stripped and
// re-annotated by babel the way the `effect` build annotates every top-level call in `dist`.
const loadContract = async (file: string, contract: Contract): Promise<string> => {
  const source = fs.readFileSync(file, "utf8")
  if (contract === "annotated") return source
  const stripped = source.replaceAll("/* @__PURE__ */ ", "")
  if (contract === "unannotated") return stripped
  const js = await esbuild.transform(stripped, { loader: "ts", format: "esm", target: "es2022" })
  const annotated = await babel.transformAsync(js.code, {
    babelrc: false,
    configFile: false,
    plugins: ["babel-plugin-annotate-pure-calls"]
  })
  return annotated!.code!
}

const buildEsbuild = async (entry: Root): Promise<Bundle> => {
  const contract = entry.contract ?? "annotated"
  const outfile = path.join(outdir, `${entry.entry.slice(0, -3)}${entry.contract ? `-${contract}` : ""}.js`)
  const result = await esbuild.build({
    entryPoints: [path.join(root, "src", entry.entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    treeShaking: true,
    outfile,
    metafile: true,
    logLevel: "silent",
    plugins: contract === "annotated" ? [] : [{
      name: "contract",
      setup(build) {
        build.onLoad({ filter: /src[\\/](FileSystem|Terminal)\.ts$/ }, async (args) => ({
          contents: await loadContract(args.path, contract),
          loader: contract === "unannotated+babel" ? "js" : "ts",
          resolveDir: path.dirname(args.path)
        }))
      }
    }]
  })
  const [outputPath, output] = Object.entries(result.metafile.outputs)[0]!
  const text = fs.readFileSync(path.resolve(root, outputPath), "utf8")
  return finish(entry, text, output.bytes, Object.keys(output.inputs), outfile)
}

const buildRolldown = async (entry: Root): Promise<Bundle> => {
  const contract = entry.contract ?? "annotated"
  const outfile = path.join(outdir, `${entry.entry.slice(0, -3)}-${contract}-rolldown.js`)
  const bundle = await rolldown({
    input: path.join(root, "src", entry.entry),
    platform: "node",
    logLevel: "silent",
    plugins: contract === "annotated" ? [] : [{
      name: "contract",
      load: (id) => contracts.includes(id) ? loadContract(id, contract) : null
    }]
  })
  const { output } = await bundle.write({ format: "esm", file: outfile })
  await bundle.close()
  const chunk = output[0]
  return finish(entry, chunk.code, Buffer.byteLength(chunk.code), chunk.moduleIds, outfile)
}

const finish = (
  entry: Root,
  text: string,
  bytes: number,
  inputs: ReadonlyArray<string>,
  output: string
): Bundle => {
  const modules = inputs.map((input) => path.relative(root, path.resolve(root, input))).sort()
  const effectModules = modules
    .filter((module) => module.includes("packages/effect/src/"))
    .map((module) => module.slice(module.indexOf("packages/effect/src/") + "packages/effect/src/".length))
  return { root: entry, bytes, text, modules, effectModules, output }
}

const build = (entry: Root) => entry.bundler === "rolldown" ? buildRolldown(entry) : buildEsbuild(entry)

const implementationsIn = (bundle: Bundle) =>
  operations.filter((operation) => bundle.modules.includes(path.join("src", "node", `${operation}.ts`)))

const describe = (bundle: Bundle, operation: string) => {
  const module = bundle.modules.includes(path.join("src", "node", `${operation}.ts`))
  const marker = bundle.text.includes(`node/FileSystem/${operation}`)
  return module && marker ? "present" : !module && !marker ? "absent" : `module=${module} marker=${marker}`
}

const bundles: Array<Bundle> = []
for (const entry of roots) bundles.push(await build(entry))

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`
const pad = (value: string, width: number) => value.padEnd(width)
const name = (bundle: Bundle) => `${bundle.root.entry}${bundle.root.contract ? ` [${bundle.root.label}]` : ""}`
let failures = 0

console.log("Bundle sizes (esm, unminified)\n")
for (const bundle of bundles) {
  console.log(`  ${pad(`${bundle.root.entry} (${bundle.root.label})`, 70)} ${kb(bundle.bytes)}`)
}

console.log("\nImplementation modules and markers in each bundle\n")
const shown = bundles.filter((bundle) =>
  !bundle.root.contract &&
  ["main.ts", "main-readonly.ts", "main-stream.ts", "main-twenty.ts", "main-full.ts"].includes(bundle.root.entry)
)
console.log(`  ${pad("operation", 26)}${shown.map((bundle) => pad(bundle.root.entry, 18)).join("")}`)
for (const operation of operations) {
  const cells = bundles.map((bundle) => {
    const expected = bundle.root.uses.includes(operation) ? "present" : "absent"
    const actual = describe(bundle, operation)
    if (actual !== expected) failures++
    return { bundle, actual, ok: actual === expected }
  })
  const line = shown.map((bundle) => {
    const cell = cells.find((c) => c.bundle === bundle)!
    return pad(cell.ok ? cell.actual : `${cell.actual} <-- unexpected`, 18)
  }).join("")
  console.log(`  ${pad(operation, 26)}${line}`)
}

console.log("")
for (const bundle of bundles) {
  const present = implementationsIn(bundle)
  const summary = present.length === operations.length ? "all" : present.length === 0 ? "none" : present.join(", ")
  console.log(
    `  ${pad(name(bundle), 62)} contains ${present.length} of ${operations.length} implementations: ${summary}`
  )
}

console.log("\nTerminal implementation modules in each bundle\n")
for (const bundle of bundles) {
  const present = terminalOperations.filter((operation) =>
    bundle.modules.includes(path.join("src", "node", "terminal", `${operation}.ts`))
  )
  const expected = bundle.root.terminal ?? []
  const ok = present.join() === expected.join()
  if (!ok) failures++
  if (present.length > 0 || expected.length > 0) {
    console.log(
      `  ${pad(name(bundle), 62)} contains ${present.length} of ${terminalOperations.length}: ${present.join(", ")}${
        ok ? "" : "   <-- unexpected"
      }`
    )
  }
}

console.log("\nStream runtime modules in each bundle (packages/effect/src)\n")
for (const bundle of bundles) {
  const present = streamModules.filter((module) => bundle.effectModules.includes(module))
  const actual = present.length === 0 ? "absent" : "present"
  const ok = actual === bundle.root.streamRuntime
  if (!ok) failures++
  console.log(
    `  ${pad(name(bundle), 62)} ${pad(`${bundle.effectModules.length} effect modules`, 20)} Stream runtime ${actual}${
      present.length > 0 ? ` (${present.join(", ")})` : ""
    }${ok ? "" : "   <-- unexpected"}`
  )
}

console.log("\nContract constants the bundler kept in the two-operation bundle\n")
for (const bundle of bundles.filter((bundle) => bundle.root.entry === "main.ts")) {
  const keys = operations.filter((operation) => bundle.text.includes(`effect/FileSystem/${operation}"`))
  const record = bundle.text.includes("\"effect/FileSystem\"") ? "present" : "absent"
  const summary = keys.length === operations.length ? "all 30" : keys.join(", ")
  console.log(`  ${pad(name(bundle), 62)} keys: ${summary}; record service: ${record}`)
}

if (failures > 0) {
  console.error(`\n${failures} expectation(s) did not hold`)
  process.exit(1)
}

// The shaken bundles are not only smaller, they run: back up a temporary file, count its bytes through the Stream
// operation, and size it through the read-only subset.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tree-shakeable-"))
const file = path.join(directory, "input.txt")
fs.writeFileSync(file, "shaken")
const runs = [
  {
    entry: "main.ts",
    expect: (out: string) => out.includes("backed up 6 bytes") && fs.readFileSync(`${file}.bak`, "utf8") === "shaken"
  },
  { entry: "main-stream.ts", expect: (out: string) => out.includes("has 6 bytes") },
  { entry: "main-readonly.ts", expect: (out: string) => out.includes("is 6 bytes") },
  { entry: "main-terminal.ts", expect: (out: string) => out.includes("displayed at") }
]
let ran = true
for (const { entry, expect } of runs) {
  const bundle = bundles.find((bundle) => bundle.root.entry === entry && !bundle.root.contract)!
  const run = spawnSync(process.execPath, [bundle.output, file], { encoding: "utf8" })
  const ok = run.status === 0 && expect(run.stdout)
  ran &&= ok
  const summary = run.stdout.trim().split("\n").at(-1)!.replaceAll(file, "<file>")
  console.log(
    `\n  node dist/${path.basename(bundle.output)} <file>: ${summary}${ok ? "" : `   <-- failed\n${run.stderr}`}`
  )
}
fs.rmSync(directory, { recursive: true, force: true })
if (!ran) process.exit(1)

console.log(
  "\nOK: every bundle contains exactly the implementations its program uses, Effect-only roots carry no Stream runtime, and the shaken bundles run"
)

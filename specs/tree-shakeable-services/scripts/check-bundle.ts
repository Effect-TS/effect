/**
 * The bundle check: bundles the composition roots and reports which
 * operation implementations, and how much of the Stream runtime, each bundle
 * contains.
 *
 *   pnpm bundle
 *
 * Each root has an expectation: the implementations it must contain, and how
 * much Stream runtime may appear (none, the few hundred bytes of a retained
 * `Stream.Operation` wrapper, or the runtime). The check fails if an
 * implementation the program does not use ends up in a bundle, if one it
 * does use is missing, or if a root's Stream bytes fall outside its band. It
 * then runs four of the bundles to show that they work.
 *
 * `effect` is bundled as it is published: every top-level call in
 * `packages/effect/src` is annotated `#__PURE__` the way the package build's
 * `babel-plugin-annotate-pure-calls` step annotates `dist`. Two rows bundle
 * `effect` from source instead, which is how this repository's own bundle
 * tests see it; they show the cost of an unannotated module body, which is
 * not a property of the design.
 *
 * Evidence is collected two ways, so neither depends on the other:
 *
 * - the bundler's metafile lists every input module of each bundle with its
 *   bytes in the output, so the `src/node/<op>.ts` modules present are the
 *   implementations present, and the bytes from `Stream.ts`, `Channel.ts`,
 *   `Sink.ts` and their internals are the Stream runtime present;
 * - every file system implementation tags its errors with a
 *   `node/FileSystem/<op>` string, so the bundle text is also scanned for
 *   those markers.
 *
 * The last group of roots is the annotation matrix: the two-operation root
 * with the contract as written (no annotations), with `@__PURE__` added to
 * each declaration, and with `annotate-pure-calls` run over the contract as
 * publishing it would, under esbuild and Rolldown.
 */
import * as babel from "@babel/core"
import * as esbuild from "esbuild"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { rolldown } from "rolldown"

const root = path.resolve(import.meta.dirname, "..")
const repo = path.resolve(root, "..", "..")
const effectSource = path.join(repo, "packages", "effect", "src")
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

type Contract = "unannotated" | "annotated" | "published"
type Bundler = "esbuild" | "rolldown"
type EffectMode = "published" | "source"
/** Which `Context.ts` the bundle gets: this branch's, or the branch point's, for the no-record comparison. */
type ContextMode = "branch" | "baseline"
// none: 0 bytes. wrapper: the `Stream.Operation` constructor and the `unwrap` it closes over, kept because a
// retained key references them; under 2 kB. used: whatever the program's own Stream code needs beyond that.
type StreamBand = "none" | "wrapper" | "used"
const bands: Record<StreamBand, (bytes: number) => boolean> = {
  none: (bytes) => bytes === 0,
  wrapper: (bytes) => bytes > 0 && bytes <= 2 * 1024,
  used: (bytes) => bytes > 2 * 1024
}

interface Root {
  readonly entry: string
  readonly label: string
  readonly uses: ReadonlyArray<string>
  readonly terminal?: ReadonlyArray<string>
  readonly stream: StreamBand
  readonly contract?: Contract
  readonly bundler?: Bundler
  readonly effect?: EffectMode
  readonly context?: ContextMode
}

const roots: ReadonlyArray<Root> = [
  { entry: "main.ts", label: "two operation layers", uses: ["readFile", "writeFile"], stream: "wrapper" },
  {
    entry: "main-namespace.ts",
    label: "two layers off a namespace",
    uses: ["readFile", "writeFile"],
    stream: "wrapper"
  },
  {
    entry: "main-readonly.ts",
    label: "ReadOnly subset, three member layers",
    uses: ["exists", "readFile", "stat"],
    stream: "wrapper"
  },
  { entry: "main-stream.ts", label: "one Stream operation", uses: ["stream"], stream: "used" },
  { entry: "main-twenty.ts", label: "twenty operation layers", uses: twenty, stream: "wrapper" },
  { entry: "main-record.ts", label: "yield* FileSystem, record layer", uses: operations, stream: "used" },
  { entry: "main-full.ts", label: "two operations, record layer", uses: operations, stream: "used" },
  {
    entry: "main-terminal.ts",
    label: "two terminal layers",
    uses: [],
    terminal: ["columns", "display"],
    stream: "none"
  },
  // A program with no record and no operation, with this branch's `Context.ts` and with the branch point's: the
  // difference is what the record-service code costs a bundle that never uses it.
  { entry: "main-plain.ts", label: "no record, no operation", uses: [], stream: "none" },
  {
    entry: "main-plain.ts",
    label: "no record, no operation, branch point Context.ts",
    uses: [],
    stream: "none",
    context: "baseline"
  },
  // The annotation matrix: the two-operation root (above, with the contract as written) with the contract
  // annotated, and published.
  {
    entry: "main.ts",
    label: "contract annotated @__PURE__, esbuild",
    uses: ["readFile", "writeFile"],
    stream: "none",
    contract: "annotated"
  },
  {
    entry: "main.ts",
    label: "contract published (annotate-pure-calls), esbuild",
    uses: ["readFile", "writeFile"],
    stream: "none",
    contract: "published"
  },
  {
    entry: "main.ts",
    label: "contract as written, rolldown",
    uses: ["readFile", "writeFile"],
    stream: "wrapper",
    contract: "unannotated",
    bundler: "rolldown"
  },
  {
    entry: "main.ts",
    label: "contract annotated @__PURE__, rolldown",
    uses: ["readFile", "writeFile"],
    stream: "none",
    contract: "annotated",
    bundler: "rolldown"
  },
  // effect bundled from source: the repository's own layout, where a module body is kept whole once any export is used
  {
    entry: "main.ts",
    label: "contract as written, effect from source, esbuild",
    uses: ["readFile", "writeFile"],
    stream: "used",
    contract: "unannotated",
    effect: "source"
  },
  {
    entry: "main.ts",
    label: "contract annotated @__PURE__, effect from source, esbuild",
    uses: ["readFile", "writeFile"],
    stream: "none",
    contract: "annotated",
    effect: "source"
  }
]

// The modules of the Stream runtime. (`Pull.ts` is not in the list: `Queue.ts` and `Schedule.ts` import it, so
// every root carries it.)
const streamModules = ["Stream.ts", "Channel.ts", "Sink.ts", "internal/stream.ts", "internal/channel.ts"]

interface Bundle {
  readonly root: Root
  readonly bytes: number
  readonly text: string
  readonly modules: ReadonlyArray<string>
  readonly effectModules: ReadonlyArray<string>
  readonly streamBytes: number
  readonly output: string
}

const contracts = [path.join(root, "src", "FileSystem.ts"), path.join(root, "src", "Terminal.ts")]

const annotatePureCalls = async (code: string): Promise<string> => {
  const result = await babel.transformAsync(code, {
    babelrc: false,
    configFile: false,
    compact: false,
    plugins: ["babel-plugin-annotate-pure-calls"]
  })
  return result!.code!
}

// The branch point's `Context.ts`, from git, for the no-record comparison.
const base = spawnSync("git", ["merge-base", "HEAD", "origin/v4/next-minor"], { cwd: repo, encoding: "utf8" })
  .stdout.trim()
const baselineContext = spawnSync("git", ["show", `${base}:packages/effect/src/Context.ts`], {
  cwd: repo,
  encoding: "utf8"
}).stdout
const contextFile = path.join(effectSource, "Context.ts")

// `effect` as published: TypeScript stripped, then every top-level call annotated, as the package build does.
const published = new Map<string, Promise<string>>()
const publish = (file: string, context: ContextMode = "branch"): Promise<string> => {
  const id = `${context}:${file}`
  let result = published.get(id)
  if (result === undefined) {
    const code = context === "baseline" && file === contextFile ? baselineContext : fs.readFileSync(file, "utf8")
    result = esbuild.transform(code, { loader: "ts", format: "esm", target: "es2022" })
      .then((js) => annotatePureCalls(js.code))
    published.set(id, result)
  }
  return result
}

// The contract as the root asks for it: as written, with `@__PURE__` on each declaration, or published.
const loadContract = async (file: string, contract: Contract): Promise<{ code: string; loader: "ts" | "js" }> => {
  const source = fs.readFileSync(file, "utf8")
  if (contract === "unannotated") return { code: source, loader: "ts" }
  if (contract === "annotated") {
    return {
      code: source.replaceAll(/= ((?:Context|Stream|Sink)\.Operations?[<(])/g, "= /* @__PURE__ */ $1"),
      loader: "ts"
    }
  }
  const js = await esbuild.transform(source, { loader: "ts", format: "esm", target: "es2022" })
  return { code: await annotatePureCalls(js.code), loader: "js" }
}

const isEffectSource = (file: string) => file.startsWith(effectSource + path.sep) && file.endsWith(".ts")

const outfileFor = (entry: Root) =>
  path.join(
    outdir,
    `${entry.entry.slice(0, -3)}${entry.contract ? `-${entry.contract}` : ""}${
      entry.effect === "source" ? "-source" : ""
    }${entry.bundler === "rolldown" ? "-rolldown" : ""}${entry.context === "baseline" ? "-baseline" : ""}.js`
  )

const buildEsbuild = async (entry: Root): Promise<Bundle> => {
  const contract = entry.contract ?? "unannotated"
  const outfile = outfileFor(entry)
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
    plugins: [{
      name: "effect-as-published",
      setup(build) {
        if (entry.effect !== "source") {
          build.onLoad({ filter: /packages[\\/]effect[\\/]src[\\/].*\.ts$/ }, async (args) =>
            isEffectSource(args.path)
              ? { contents: await publish(args.path, entry.context), loader: "js", resolveDir: path.dirname(args.path) }
              : undefined)
        }
        if (contract !== "unannotated") {
          build.onLoad({ filter: /src[\\/](FileSystem|Terminal)\.ts$/ }, async (args) => {
            if (!contracts.includes(args.path)) return undefined
            const loaded = await loadContract(args.path, contract)
            return { contents: loaded.code, loader: loaded.loader, resolveDir: path.dirname(args.path) }
          })
        }
      }
    }]
  })
  const [outputPath, output] = Object.entries(result.metafile.outputs)[0]!
  const text = fs.readFileSync(path.resolve(root, outputPath), "utf8")
  const inputs = Object.entries(output.inputs).map(([file, input]) => [file, input.bytesInOutput] as const)
  return finish(entry, text, output.bytes, inputs, outfile)
}

const buildRolldown = async (entry: Root): Promise<Bundle> => {
  const contract = entry.contract ?? "unannotated"
  const outfile = outfileFor(entry)
  const bundle = await rolldown({
    input: path.join(root, "src", entry.entry),
    platform: "node",
    logLevel: "silent",
    plugins: [{
      name: "effect-as-published",
      load: (id) =>
        contracts.includes(id) && contract !== "unannotated"
          ? loadContract(id, contract).then((loaded) => loaded.code)
          : entry.effect !== "source" && isEffectSource(id)
          ? publish(id)
          : null
    }]
  })
  const { output } = await bundle.write({ format: "esm", file: outfile })
  await bundle.close()
  const chunk = output[0]
  const inputs = Object.entries(chunk.modules).map(([id, module]) => [id, module.renderedLength] as const)
  return finish(entry, chunk.code, Buffer.byteLength(chunk.code), inputs, outfile)
}

const finish = (
  entry: Root,
  text: string,
  bytes: number,
  inputs: ReadonlyArray<readonly [file: string, bytes: number]>,
  output: string
): Bundle => {
  const relative = inputs.map(([file, size]) => [path.relative(root, path.resolve(root, file)), size] as const)
  const modules = relative.map(([file]) => file).sort()
  const effectInputs = relative
    .filter(([file]) => file.includes("packages/effect/src/"))
    .map(([file, size]) =>
      [file.slice(file.indexOf("packages/effect/src/") + "packages/effect/src/".length), size] as const
    )
  const streamBytes = effectInputs
    .filter(([file]) => streamModules.includes(file))
    .reduce((total, [, size]) => total + size, 0)
  return { root: entry, bytes, text, modules, effectModules: effectInputs.map(([file]) => file), streamBytes, output }
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
const size = (bytes: number) => bytes === 0 ? "0 B" : bytes < 10 * 1024 ? `${bytes} B` : kb(bytes)
const pad = (value: string, width: number) => value.padEnd(width)
const name = (bundle: Bundle) => `${bundle.root.entry}${bundle.root.contract ? ` [${bundle.root.label}]` : ""}`
let failures = 0

console.log("Bundle sizes (esm, unminified; effect as published unless noted)\n")
for (const bundle of bundles) {
  console.log(`  ${pad(`${bundle.root.entry} (${bundle.root.label})`, 74)} ${kb(bundle.bytes).padStart(9)}`)
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
    `  ${pad(name(bundle), 66)} contains ${present.length} of ${operations.length} implementations: ${summary}`
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
      `  ${pad(name(bundle), 66)} contains ${present.length} of ${terminalOperations.length}: ${present.join(", ")}${
        ok ? "" : "   <-- unexpected"
      }`
    )
  }
}

console.log(
  "\nStream runtime bytes in each bundle (Stream.ts, Channel.ts, Sink.ts and their internals; wrapper = under 2 kB)\n"
)
for (const bundle of bundles) {
  const present = streamModules.filter((module) => bundle.effectModules.includes(module))
  const ok = bands[bundle.root.stream](bundle.streamBytes)
  if (!ok) failures++
  console.log(
    `  ${pad(name(bundle), 66)} ${pad(`${bundle.effectModules.length} effect modules`, 20)} ${
      size(bundle.streamBytes).padStart(9)
    }  expected ${bundle.root.stream}${present.length > 0 ? ` (${present.join(", ")})` : ""}${
      ok ? "" : "   <-- unexpected"
    }`
  )
}

console.log("\nWhat Context.ts costs a bundle with no record and no operation\n")
{
  const plain = bundles.find((bundle) => bundle.root.entry === "main-plain.ts" && bundle.root.context !== "baseline")!
  const baseline = bundles.find((bundle) =>
    bundle.root.entry === "main-plain.ts" && bundle.root.context === "baseline"
  )!
  const delta = plain.bytes - baseline.bytes
  const ok = delta <= 512
  if (!ok) failures++
  console.log(`  ${pad("this branch", 20)} ${kb(plain.bytes).padStart(9)}`)
  console.log(`  ${pad("branch point", 20)} ${kb(baseline.bytes).padStart(9)}`)
  console.log(`  ${pad("difference", 20)} ${`${delta} B`.padStart(9)}  limit 512 B${ok ? "" : "   <-- unexpected"}`)
}

console.log("\nContract constants the bundler kept in the two-operation bundle\n")
for (const bundle of bundles.filter((bundle) => bundle.root.entry === "main.ts")) {
  const keys = operations.filter((operation) => bundle.text.includes(`effect/FileSystem/${operation}"`))
  const record = bundle.text.includes("\"effect/FileSystem\"") ? "present" : "absent"
  const summary = keys.length === operations.length ? "all 30" : keys.join(", ")
  console.log(`  ${pad(name(bundle), 66)} keys: ${summary}; record service: ${record}`)
}

if (failures > 0) {
  console.error(`\n${failures} expectation(s) did not hold`)
  process.exit(1)
}

// The shaken bundles are not only smaller, they run: back up a temporary file, count its bytes through the Stream
// operation, size it through the read-only subset, and display at the terminal's width.
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
  { entry: "main-terminal.ts", expect: (out: string) => out.includes("displayed at") },
  { entry: "main-plain.ts", expect: (out: string) => out.includes("hello, ") }
]
let ran = true
for (const { entry, expect } of runs) {
  const bundle = bundles.find((bundle) => bundle.root.entry === entry && !bundle.root.contract && !bundle.root.context)!
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
  "\nOK: every bundle contains exactly the implementations its program uses, Effect-only roots carry at most a retained wrapper of the Stream runtime, and the shaken bundles run"
)

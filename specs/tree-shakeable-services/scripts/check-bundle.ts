/**
 * The esbuild check: bundles the composition roots and reports which
 * operation implementations, and which parts of the `effect` runtime, each
 * bundle contains.
 *
 *   pnpm bundle
 *
 * Each root has an expectation: the implementations it must contain, and
 * whether the Stream runtime may appear. The check fails if an
 * implementation the program does not use ends up in a bundle, if one it
 * does use is missing, or if a root that uses only Effect operations pulls
 * in a Stream module. It then runs the two-operation bundle to show that it
 * works.
 *
 * Evidence is collected two ways, so neither depends on the other:
 *
 * - the esbuild metafile lists every input module of each bundle, so the
 *   `src/node/<op>.ts` modules present are the implementations present, and
 *   the `packages/effect/src/*` modules present are the runtime present;
 * - every implementation tags its errors with a `node/FileSystem/<op>` string,
 *   so the bundle text is also scanned for those markers.
 */
import * as esbuild from "esbuild"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const outdir = path.join(root, "dist")
const operations = fs.readdirSync(path.join(root, "src", "node"))
  .filter((file) => file.endsWith(".ts") && !["index.ts", "internal.ts", "layer.ts"].includes(file))
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

interface Root {
  readonly entry: string
  readonly label: string
  readonly uses: ReadonlyArray<string>
  readonly streamRuntime: "absent" | "present"
}

const roots: ReadonlyArray<Root> = [
  { entry: "main.ts", label: "two operation layers", uses: ["readFile", "writeFile"], streamRuntime: "absent" },
  {
    entry: "main-namespace.ts",
    label: "two layers off a namespace",
    uses: ["readFile", "writeFile"],
    streamRuntime: "absent"
  },
  { entry: "main-stream.ts", label: "one Stream operation", uses: ["stream"], streamRuntime: "present" },
  { entry: "main-twenty.ts", label: "twenty operation layers", uses: twenty, streamRuntime: "absent" },
  { entry: "main-record.ts", label: "yield* FileSystem, record layer", uses: operations, streamRuntime: "present" },
  { entry: "main-full.ts", label: "two operations, record layer", uses: operations, streamRuntime: "present" }
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
}

const build = async (entry: Root): Promise<Bundle> => {
  const result = await esbuild.build({
    entryPoints: [path.join(root, "src", entry.entry)],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2022",
    treeShaking: true,
    outdir,
    metafile: true,
    logLevel: "silent"
  })
  const [outputPath, output] = Object.entries(result.metafile.outputs)[0]!
  const text = fs.readFileSync(path.resolve(root, outputPath), "utf8")
  const modules = Object.keys(output.inputs)
    .map((input) => path.relative(root, path.resolve(root, input)))
    .sort()
  const effectModules = modules
    .filter((module) => module.includes("packages/effect/src/"))
    .map((module) => module.slice(module.indexOf("packages/effect/src/") + "packages/effect/src/".length))
  return { root: entry, bytes: output.bytes, text, modules, effectModules }
}

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
let failures = 0

console.log("Bundle sizes (esbuild, esm, unminified)\n")
for (const bundle of bundles) {
  console.log(`  ${pad(`${bundle.root.entry} (${bundle.root.label})`, 52)} ${kb(bundle.bytes)}`)
}

console.log("\nImplementation modules and markers in each bundle\n")
const shown = bundles.filter((bundle) =>
  ["main.ts", "main-stream.ts", "main-twenty.ts", "main-full.ts"].includes(bundle.root.entry)
)
console.log(`  ${pad("operation", 26)}${shown.map((bundle) => pad(bundle.root.entry, 16)).join("")}`)
for (const operation of operations) {
  const cells = bundles.map((bundle) => {
    const expected = bundle.root.uses.includes(operation) ? "present" : "absent"
    const actual = describe(bundle, operation)
    if (actual !== expected) failures++
    return { bundle, actual, ok: actual === expected }
  })
  const line = shown.map((bundle) => {
    const cell = cells.find((c) => c.bundle === bundle)!
    return pad(cell.ok ? cell.actual : `${cell.actual} <-- unexpected`, 16)
  }).join("")
  console.log(`  ${pad(operation, 26)}${line}`)
}

console.log("")
for (const bundle of bundles) {
  const present = implementationsIn(bundle)
  const summary = present.length === operations.length ? "all" : present.join(", ")
  console.log(
    `  ${pad(bundle.root.entry, 20)} contains ${present.length} of ${operations.length} implementations: ${summary}`
  )
}

console.log("\nStream runtime modules in each bundle (packages/effect/src)\n")
for (const bundle of bundles) {
  const present = streamModules.filter((module) => bundle.effectModules.includes(module))
  const actual = present.length === 0 ? "absent" : "present"
  const ok = actual === bundle.root.streamRuntime
  if (!ok) failures++
  console.log(
    `  ${pad(bundle.root.entry, 20)} ${
      pad(`${bundle.effectModules.length} effect modules`, 20)
    } Stream runtime ${actual}${present.length > 0 ? ` (${present.join(", ")})` : ""}${ok ? "" : "   <-- unexpected"}`
  )
}

const shaken = bundles[0]!
const contractKeys = operations.filter((operation) => shaken.text.includes(`effect/FileSystem/${operation}"`))
console.log(`\n  operation keys in main.ts (contract constants the bundler kept): ${contractKeys.join(", ")}`)
console.log(
  `  record service "effect/FileSystem" in main.ts: ${
    shaken.text.includes("\"effect/FileSystem\"") ? "present" : "absent"
  }`
)

if (failures > 0) {
  console.error(`\n${failures} expectation(s) did not hold`)
  process.exit(1)
}

// The shaken bundle is not only smaller, it runs: back up a temporary file with it.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tree-shakeable-"))
const file = path.join(directory, "input.txt")
fs.writeFileSync(file, "shaken")
const run = spawnSync(process.execPath, [path.join(outdir, "main.js"), file], { encoding: "utf8" })
const backup = fs.existsSync(`${file}.bak`) ? fs.readFileSync(`${file}.bak`, "utf8") : undefined
const streamRun = spawnSync(process.execPath, [path.join(outdir, "main-stream.js"), file], { encoding: "utf8" })
fs.rmSync(directory, { recursive: true, force: true })
const ran = run.status === 0 && backup === "shaken"
const streamRan = streamRun.status === 0 && streamRun.stdout.includes("has 6 bytes")
console.log(`\n  node dist/main.js <file>: ${run.stdout.trim().replace(file, "<file>")}${ran ? "" : "   <-- failed"}`)
console.log(
  `  node dist/main-stream.js <file>: ${streamRun.stdout.trim().replace(file, "<file>")}${
    streamRan ? "" : "   <-- failed"
  }`
)
if (!ran || !streamRan) {
  console.error(run.stderr, streamRun.stderr)
  process.exit(1)
}

console.log(
  "\nOK: every bundle contains exactly the implementations its program uses, Effect-only roots carry no Stream runtime, and the shaken bundles run"
)

/**
 * The esbuild check: bundles the composition roots and reports which
 * operation implementations each bundle contains.
 *
 *   pnpm bundle
 *
 * `src/main.ts` and `src/main-namespace.ts` provide two operations and must
 * contain exactly those two implementations. `src/main-full.ts` provides the
 * aggregate layer and is the baseline. The check fails if an implementation
 * the program does not use ends up in a shaken bundle, or if one it does use
 * is missing. It then runs the shaken bundle to show that it works.
 *
 * Evidence is collected two ways, so neither depends on the other:
 *
 * - the esbuild metafile lists every input module of each bundle, so the
 *   `src/node/<op>.ts` modules present are the implementations present;
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

const used = ["readFile", "writeFile"]

interface Bundle {
  readonly entry: string
  readonly bytes: number
  readonly text: string
  readonly modules: ReadonlyArray<string>
}

const build = async (entry: string): Promise<Bundle> => {
  const result = await esbuild.build({
    entryPoints: [path.join(root, "src", entry)],
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
  return { entry, bytes: output.bytes, text, modules }
}

const implementationsIn = (bundle: Bundle) =>
  operations.filter((operation) => bundle.modules.includes(path.join("src", "node", `${operation}.ts`)))

const describe = (bundle: Bundle, operation: string) => {
  const module = bundle.modules.includes(path.join("src", "node", `${operation}.ts`))
  const marker = bundle.text.includes(`node/FileSystem/${operation}`)
  return module && marker ? "present" : !module && !marker ? "absent" : `module=${module} marker=${marker}`
}

const shaken = await build("main.ts")
const namespace = await build("main-namespace.ts")
const full = await build("main-full.ts")
const bundles = [shaken, namespace, full]

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`
const pad = (value: string, width: number) => value.padEnd(width)

console.log("Bundle sizes (esbuild, esm, unminified)\n")
console.log(`  main.ts (two operation layers)                ${kb(shaken.bytes)}`)
console.log(`  main-namespace.ts (two layers off a namespace) ${kb(namespace.bytes)}`)
console.log(`  main-full.ts (aggregate layer)                ${kb(full.bytes)}\n`)

console.log("Implementation modules and markers in each bundle\n")
console.log(`  ${pad("operation", 26)} ${pad("main.ts", 12)} ${pad("main-namespace.ts", 20)} main-full.ts`)
let failures = 0
for (const operation of operations) {
  const expected = used.includes(operation) ? "present" : "absent"
  const cells = bundles.map((bundle) => describe(bundle, operation))
  const ok = cells[0] === expected && cells[1] === expected && cells[2] === "present"
  if (!ok) failures++
  console.log(
    `  ${pad(operation, 26)} ${pad(cells[0]!, 12)} ${pad(cells[1]!, 20)} ${cells[2]}${ok ? "" : "   <-- unexpected"}`
  )
}

for (const bundle of bundles) {
  const present = implementationsIn(bundle)
  console.log(
    `\n  ${bundle.entry} contains ${present.length} of ${operations.length} implementations: ${present.join(", ")}`
  )
}

const contractKeys = operations.filter((operation) => shaken.text.includes(`effect/FileSystem/${operation}"`))
console.log(`\n  operation keys in main.ts (contract constants the bundler kept): ${contractKeys.join(", ")}`)

if (failures > 0) {
  console.error(`\n${failures} operation(s) did not match the expectation`)
  process.exit(1)
}

// The shaken bundle is not only smaller, it runs: back up a temporary file with it.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tree-shakeable-"))
const file = path.join(directory, "input.txt")
fs.writeFileSync(file, "shaken")
const run = spawnSync(process.execPath, [path.join(outdir, "main.js"), file], { encoding: "utf8" })
const backup = fs.existsSync(`${file}.bak`) ? fs.readFileSync(`${file}.bak`, "utf8") : undefined
fs.rmSync(directory, { recursive: true, force: true })
const ran = run.status === 0 && backup === "shaken"
console.log(`\n  node dist/main.js <file>: ${run.stdout.trim().replace(file, "<file>")}${ran ? "" : "   <-- failed"}`)
if (!ran) {
  console.error(run.stderr)
  process.exit(1)
}

console.log("\nOK: the shaken bundles contain exactly the implementations the program uses, and run")

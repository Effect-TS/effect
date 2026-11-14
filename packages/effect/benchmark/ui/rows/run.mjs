// The keyed-table benchmark (js-framework-benchmark's operations) for effect/ui, and the same table
// on React as a baseline, in headless Chromium: rendering times and JS heap sizes.
//
// Run from the repository root:
//
//   node packages/effect/benchmark/ui/rows/run.mjs [--rounds 5] [--ops create1k,swap] [--variants plain]
//     [--memory-only | --time-only] [--profile plain:replace1k] [--chromium <path>]
//
// The browser is --chromium, else $CHROMIUM, else `chromium` on PATH, else the Chromium that the
// `playwright` dev dependency installed. entry.ts is bundled with esbuild (minified IIFE, es2023,
// production) straight from packages/effect/src, so it measures the working tree. The bundle goes to
// scratchpad/rows.bundle.js; delete it when done.
//
// Variants, rendering the same table (see harness.ts): effect/ui's `plain` (one component) and
// `component` (a child component per row), and React's `react-plain`, `react-component` (a row
// component, unmemoized) and `react-memo` (a row component under React.memo); see react.mjs. The
// default is effect/ui's two. React variants run from scratchpad/rows-react.bundle.js, built the same
// way from react.mjs with the React that @effect/atom-react's dev dependencies installed (the run
// prints its version), so a page loads one framework only.
//
// Times, in milliseconds from the message (or click) to the first microtask after the change is in
// the DOM. Style, layout and paint are not included:
//
//   create1k   1,000 rows into an empty table        replace1k  1,000 new rows over 1,000
//   update10th every 10th label of 1,000 changes     select     a click selects one of 1,000 rows
//   swap       rows 2 and 999 of 1,000 swap          remove     a click removes one of 1,000 rows
//   create10k  10,000 rows into an empty table       append1k   1,000 rows after 1,000
//   clear1k    1,000 rows removed
//
// Protocol. Per round, a fresh page per variant and operation runs 2 unmeasured and 9 measured
// steps (create10k: 1 and 3), each after its setup; the round's figure is their median. The table
// shows the median across rounds and the range (min-max). Variant order rotates each round.
//
// Memory, in MiB (2^20 bytes) of used JS heap after a forced garbage collection, on a fresh page per variant
// and round: `ready` once mounted, then `1k` after 1,000 rows, `replace` after replacing them
// 5 times, `cycle` after 5 create-then-clear cycles of 1,000 rows (back to an empty table, so
// it tracks `ready` unless something is retained) and `10k` after 10,000 rows.
//
// --profile variant:op profiles 20 steps of one operation, from an unminified bundle, and prints
// the functions with the most self time across them (line numbers are the bundle's). The last
// step's profile goes to scratchpad/rows-<variant>-<op>.cpuprofile.
//
// Treat results as exploratory: compare paired runs of the same command across revisions on one
// machine; absolute figures depend on the machine and the browser.
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import { chromium } from "playwright"

const { values: args } = parseArgs({
  options: {
    rounds: { type: "string", default: "5" },
    ops: { type: "string" },
    variants: { type: "string", default: "plain,component" },
    "memory-only": { type: "boolean", default: false },
    "time-only": { type: "boolean", default: false },
    profile: { type: "string" },
    chromium: { type: "string" }
  }
})

// esbuild is a transitive dependency, so it is taken from the pnpm store.
const store = path.join(process.cwd(), "node_modules/.pnpm")
const esbuild = fs.readdirSync(store).filter((name) => name.startsWith("esbuild@"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1)
const { build } = await import(pathToFileURL(path.join(store, esbuild, "node_modules/esbuild/lib/main.js")).href)

const variants = (args.profile?.split(":")[0] ?? args.variants).split(",")
const isReact = (variant) => variant.startsWith("react-")
// React isn't a dependency of effect: it comes from the workspace package that develops against it.
const reactModules = path.join(process.cwd(), "packages/atom/react/node_modules")
const bundles = {
  effect: { entry: "entry.ts", out: path.join(process.cwd(), "scratchpad/rows.bundle.js") },
  react: { entry: "react.mjs", out: path.join(process.cwd(), "scratchpad/rows-react.bundle.js") }
}
const bundleOf = (variant) => isReact(variant) ? bundles.react : bundles.effect
for (const bundle of new Set(variants.map(bundleOf))) {
  await build({
    entryPoints: [path.join(import.meta.dirname, bundle.entry)],
    bundle: true,
    minify: args.profile === undefined,
    format: "iife",
    platform: "browser",
    target: "es2023",
    define: { "process.env.NODE_ENV": "\"production\"" },
    nodePaths: bundle === bundles.react ? [reactModules] : [],
    outfile: bundle.out,
    logLevel: "error"
  })
}

const which = () => {
  try {
    return execSync("which chromium", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || undefined
  } catch {
    return undefined
  }
}
const executablePath = args.chromium ?? process.env.CHROMIUM ?? which()
const browser = await chromium.launch({ executablePath, headless: true, args: ["--js-flags=--expose-gc"] })
console.log("chromium " + browser.version() + " (" + (executablePath ?? "playwright") + "), node " + process.version)
if (variants.some(isReact)) {
  const version = (name) => JSON.parse(fs.readFileSync(path.join(reactModules, name, "package.json"), "utf8")).version
  console.log("react " + version("react") + ", react-dom " + version("react-dom") + " (production builds)")
}

const open = async (variant) => {
  const page = await browser.newPage()
  page.on("pageerror", (error) => console.error("page error:", error.message))
  await page.setContent("<!doctype html><html><body></body></html>")
  await page.addScriptTag({ path: bundleOf(variant).out })
  return page
}

const rounds = Number(args.rounds)
const stat = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)].toFixed(2) + " (" + sorted[0].toFixed(2) + "-" +
    sorted[sorted.length - 1].toFixed(2) + ")"
}

if (args.profile !== undefined) {
  const [variant, op] = args.profile.split(":")
  const page = await open(variant)
  const cdp = await page.context().newCDPSession(page)
  await page.evaluate(([v, o]) => window.bench(v, o, 2, 2), [variant, op])
  await cdp.send("Profiler.enable")
  await cdp.send("Profiler.setSamplingInterval", { interval: 50 })
  const profiles = []
  cdp.on("Profiler.consoleProfileFinished", ({ profile }) => profiles.push(profile))
  await page.evaluate(([v, o]) => window.bench(v, o, 0, 20, true), [variant, op])
  const file = path.join(process.cwd(), "scratchpad/rows-" + variant + "-" + op + ".cpuprofile")
  fs.writeFileSync(file, JSON.stringify(profiles.at(-1)))
  const self = new Map()
  let total = 0
  for (const profile of profiles) {
    const dt = new Map(profile.nodes.map((node) => [node.id, 0]))
    for (let i = 0; i < profile.samples.length; i++) {
      dt.set(profile.samples[i], dt.get(profile.samples[i]) + (profile.timeDeltas[i] ?? 0))
    }
    for (const node of profile.nodes) {
      const name = (node.callFrame.functionName || "(anonymous)") + " " + node.callFrame.lineNumber
      if (node.callFrame.functionName === "(idle)" || node.callFrame.functionName === "(program)") continue
      self.set(name, (self.get(name) ?? 0) + dt.get(node.id))
      total += dt.get(node.id)
    }
  }
  console.log("wrote the last step's profile to " + file + "; self time over " + profiles.length + " steps, " +
    (total / 1000).toFixed(1) + " ms busy:")
  for (const [name, time] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
    console.log((time / 1000).toFixed(2).padStart(9) + " ms  " + (100 * time / total).toFixed(1).padStart(5) + "%  " + name)
  }
  await browser.close()
  process.exit(0)
}

if (!args["memory-only"]) {
  const page = await open(variants[0])
  const ops = args.ops?.split(",") ?? await page.evaluate(() => window.opNames)
  await page.close()
  const results = Object.fromEntries(variants.map((v) => [v, Object.fromEntries(ops.map((op) => [op, []]))]))
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[(i + round) % variants.length]
      for (const op of ops) {
        const page = await open(variant)
        const big = op === "create10k"
        results[variant][op].push(
          await page.evaluate(([v, o, w, r]) => window.bench(v, o, w, r), [variant, op, big ? 1 : 2, big ? 3 : 9])
        )
        await page.close()
      }
    }
  }
  console.log("times: " + rounds + " rounds, median (min-max) ms")
  for (const op of ops) {
    console.log(op.padEnd(11), variants.map((v) => v + " " + stat(results[v][op])).join(" | "))
  }
}

if (!args["time-only"]) {
  const keys = ["ready", "1k", "replace", "cycle", "10k"]
  const results = Object.fromEntries(variants.map((v) => [v, Object.fromEntries(keys.map((k) => [k, []]))]))
  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[(i + round) % variants.length]
      const page = await open(variant)
      const cdp = await page.context().newCDPSession(page)
      const heap = async (key) => {
        for (let j = 0; j < 3; j++) await cdp.send("HeapProfiler.collectGarbage")
        const { usedSize } = await cdp.send("Runtime.getHeapUsage")
        results[variant][key].push(usedSize / 1024 / 1024)
      }
      await page.evaluate((v) => window.memory.mount(v), variant)
      await heap("ready")
      await page.evaluate(() => window.memory.run(1000))
      await heap("1k")
      await page.evaluate(() => window.memory.replace(1000, 5))
      await heap("replace")
      await page.evaluate(() => window.memory.cycle(1000, 5))
      await heap("cycle")
      await page.evaluate(() => window.memory.run(10000))
      await heap("10k")
      await page.evaluate(() => window.memory.close())
      await page.close()
    }
  }
  console.log("memory: " + rounds + " rounds, median (min-max) MiB")
  for (const key of keys) {
    console.log(key.padEnd(11), variants.map((v) => v + " " + stat(results[v][key])).join(" | "))
  }
}
await browser.close()

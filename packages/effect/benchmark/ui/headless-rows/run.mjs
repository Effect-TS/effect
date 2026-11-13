// 1k-row benchmark for effect/ui headless components, in headless Chromium.
//
// Run from the repository root:
//
//   node packages/effect/benchmark/ui/headless-rows/run.mjs [rows=1000] [rounds=7] [chromium]
//
// The browser is the third argument, else $CHROMIUM, else `chromium` on PATH, else the Chromium that
// the `playwright` dev dependency installed (`pnpm exec playwright install chromium`). The run prints
// the browser version and Node version it used. It writes the bundle to
// scratchpad/headless-rows.bundle.js; delete it when done.
//
// What is built: entry.ts is bundled with esbuild (minified IIFE, es2023,
// process.env.NODE_ENV = "production") straight from packages/effect/src, so it measures the working
// tree. esbuild strips types only; `pnpm check` type checks entry.ts through tsconfig.tests.json.
//
// Variants. Each renders the same 1k rows, li.row[data-done] > button[aria-expanded][aria-controls] +
// span + div#panel[hidden], under one list component whose Model is the rows:
//
//   plain     every row is plain elements in the list's own view; one component in total.
//   normal    a normal child component per row (key + props), which owns its markup and its
//             open state, and skips rendering when its props are equal.
//   headless  a headless child per row (Disclosure, `parts` only): the list's `view` closure
//             applies the trigger and panel parts to its own builders, so the row's markup is the
//             list's code and is rebuilt whenever the list renders.
//   wrapped   a normal row component (key + props) whose view holds the headless Disclosure child,
//             so the props skip happens above the closure.
//
// Metrics, in milliseconds of wall-clock time on an otherwise idle page. Each update figure runs from
// just before the message is sent (or the click) to the first microtask after the render flush, which
// covers update, the views, the diff, the DOM writes and commit hooks; not layout or paint:
//
//   mount     BrowserHost.mountEffect into an empty container until every row is in the DOM.
//   hydrate   mounting over HtmlServer.renderToHtml output with its state until `adopted` resolves;
//             the run checks the first server row node is reused and live.
//   toggle    a list message that flips one row's `done` (one row's props change).
//   reverse   a list message that reverses all rows (every keyed row moves).
//   click     a DOM click on one row's button: the row child's own state in normal, headless and
//             wrapped, a list message in plain.
//
// Protocol. A round opens a fresh page per variant and runs `bench`: one warmup pass with 5 repeats,
// then a measured pass with 21 repeats per update metric (mount and hydrate happen once per pass).
// The round's toggle, reverse and click figures are the median of their 21 repeats. Variant order
// rotates each round so no variant always runs first. The table reports, per variant and metric, the
// median across rounds and the range (min-max) across rounds. "hops" is the most tasks any round needed
// before the change showed (mount, updates); updates must render on the first microtask, so a
// non-zero update figure fails the run.
//
// Treat results as exploratory: compare variants within one run on one machine, and paired runs of
// the same command across revisions; absolute figures depend on the machine and browser.
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

// esbuild is a transitive dependency, so it is taken from the pnpm store.
const store = path.join(process.cwd(), "node_modules/.pnpm")
const esbuild = fs.readdirSync(store).filter((name) => name.startsWith("esbuild@"))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).at(-1)
const { build } = await import(pathToFileURL(path.join(store, esbuild, "node_modules/esbuild/lib/main.js")).href)

const dir = import.meta.dirname
const out = path.join(process.cwd(), "scratchpad/headless-rows.bundle.js")
await build({
  entryPoints: [path.join(dir, "entry.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2023",
  define: { "process.env.NODE_ENV": "\"production\"" },
  outfile: out,
  logLevel: "error"
})

const count = Number(process.argv[2] ?? 1000)
const rounds = Number(process.argv[3] ?? 7)
const names = ["plain", "normal", "headless", "wrapped"]
const which = () => {
  try {
    return execSync("which chromium", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || undefined
  } catch {
    return undefined
  }
}
// undefined falls back to the browser playwright installed.
const executablePath = process.argv[4] ?? process.env.CHROMIUM ?? which()
const browser = await chromium.launch({ executablePath, headless: true })
console.log("chromium " + browser.version() + " (" + (executablePath ?? "playwright") + "), node " + process.version)
const results = Object.fromEntries(names.map((name) => [name, []]))
for (let round = 0; round < rounds; round++) {
  // Each variant gets a fresh page, and the order rotates so no variant always runs first.
  for (let i = 0; i < names.length; i++) {
    const name = names[(i + round) % names.length]
    const page = await browser.newPage()
    page.on("pageerror", (error) => console.error("page error:", error.message))
    await page.setContent("<!doctype html><html><body></body></html>")
    await page.addScriptTag({ path: out })
    results[name].push(await page.evaluate(([n, c]) => window.bench(n, c), [name, count]))
    await page.close()
  }
}
await browser.close()

const stat = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)].toFixed(1) + " (" + sorted[0].toFixed(1) + "-" + sorted[sorted.length - 1].toFixed(1) + ")"
}
console.log(count + " rows, " + rounds + " rounds, median (min-max) ms")
for (const name of names) {
  const row = results[name]
  console.log(
    name.padEnd(9),
    ["mount", "hydrate", "toggle", "reverse", "click"].map((key) => key + " " + stat(row.map((r) => r[key]))).join(" | "),
    "| hops", Math.max(...row.map((r) => r.mountHops)), Math.max(...row.map((r) => r.updateHops))
  )
}

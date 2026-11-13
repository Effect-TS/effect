// Spike harness, not a maintained benchmark: 1k rows in headless Chromium, four ways to build a row.
// Run from the repository root: node packages/effect/benchmark/ui/headless-rows/run.mjs [rows] [rounds] [chromium]
import { execSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import { chromium } from "playwright"

// esbuild is a transitive dependency, so it is taken from the pnpm store.
const store = path.join(process.cwd(), "node_modules/.pnpm")
const esbuild = fs.readdirSync(store).filter((name) => name.startsWith("esbuild@")).sort().at(-1)
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
const browser = await chromium.launch({ executablePath: process.argv[4] ?? execSync("which chromium").toString().trim(), headless: true })
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

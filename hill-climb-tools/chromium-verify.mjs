// Bundles chromium-probe.ts with Vite and runs it in Playwright Chromium.
// Exits non-zero when a check fails. Run inside `nix develop` from the repo root.
import { build } from "vite"
import { chromium } from "playwright"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
const root = resolve(import.meta.dirname, "..")
const outDir = resolve(root, "tmp/cv")
await build({
  configFile: false,
  logLevel: "warn",
  resolve: { alias: [{ find: /^effect$/, replacement: resolve(root, "packages/effect/src/index.ts") }] },
  build: {
    outDir, emptyOutDir: true, minify: false, target: "es2022",
    lib: { entry: resolve(import.meta.dirname, "chromium-probe.ts"), formats: ["iife"], name: "probe", fileName: () => "probe.js" }
  }
})
const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on("pageerror", (error) => pageErrors.push(error.message))
await page.goto("about:blank")
await page.evaluate(() => {
  globalThis.__rejections = []
  addEventListener("unhandledrejection", (e) => globalThis.__rejections.push(String(e.reason)))
})
await page.addScriptTag({ content: readFileSync(resolve(outDir, "probe.js"), "utf8") })
const result = await page.evaluate(async () => ({ ...(await globalThis.probe.run()), unhandledRejections: globalThis.__rejections }))
result.pageErrors = pageErrors
await browser.close()
console.log(JSON.stringify(result, null, 2))
const checks = {
  postTask: result.hasPostTask,
  unclampedYields: result.yieldMs < 50,
  priorityOrder: result.order.join() === "p-1,p0-1,p0-2,p5-1",
  interruption: result.finalized && result.interrupted,
  partialGlobalFallback: result.fallback === "ok" && result.restored,
  thrownTaskReported: result.pageErrors.some((m) => m.includes("chromium-task-boom")),
  noUnhandledRejection: result.unhandledRejections.length === 0
}
console.log(checks)
const ok = Object.values(checks).every(Boolean)
console.log(ok ? "ALL CHROMIUM CHECKS PASSED" : "CHROMIUM CHECKS FAILED")
if (!ok) process.exitCode = 1

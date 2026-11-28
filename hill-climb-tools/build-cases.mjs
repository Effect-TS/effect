// Bundles hostperf cases.ts the way `pnpm hostperf` does (Vite, unminified,
// es2022) into tmp/hc/cases.js, so run-case.ts --bundled measures the same code.
import { build } from "vite"
import { resolve } from "node:path"
// HC_ROOT bundles another checkout (e.g. tmp/bundle-base); HC_OUT names the output directory
const root = resolve(import.meta.dirname, "..", process.env.HC_ROOT ?? "")
const out = resolve(import.meta.dirname, "..", process.env.HC_OUT ?? "tmp/hc")
await build({
  configFile: false,
  logLevel: "warn",
  resolve: { alias: [{ find: /^effect$/, replacement: resolve(root, "packages/effect/src/index.ts") }] },
  build: {
    outDir: out,
    emptyOutDir: true,
    minify: false,
    target: "es2022",
    lib: { entry: resolve(root, "packages/effect/benchmark/hostperf/cases.ts"), formats: ["es"], fileName: () => "cases.js" }
  }
})

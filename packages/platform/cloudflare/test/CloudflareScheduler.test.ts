import { assert, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare-v5"
import * as path from "node:path"

it("resumes a shared fiber from a later Worker request", async () => {
  const bundle = await esbuild.build({
    entryPoints: [path.join(import.meta.dirname, "fixtures/scheduler-worker.ts")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    external: ["cloudflare:workers", "node:*"],
    alias: {
      "@effect/platform-cloudflare": path.join(import.meta.dirname, "../src")
    }
  })
  const miniflare = new Miniflare({
    workers: [{
      config: {
        name: "scheduler",
        manifest: {
          mainModule: "worker.mjs",
          modules: { "worker.mjs": { type: "esm", contents: bundle.outputFiles[0].text } }
        },
        compatibilityDate: "2026-07-01",
        compatibilityFlags: ["nodejs_compat"]
      }
    }]
  })
  try {
    const start = await miniflare.dispatchFetch("http://localhost/start")
    assert.strictEqual(start.status, 200)
    assert.strictEqual(await start.json(), "started")
    const resume = await miniflare.dispatchFetch("http://localhost/resume")
    assert.strictEqual(resume.status, 200, await resume.clone().text())
    assert.deepStrictEqual(await resume.json(), { done: true, initialized: true })
    const status = await miniflare.dispatchFetch("http://localhost/status")
    assert.deepStrictEqual(await status.json(), { done: true, initialized: true })
  } finally {
    await miniflare.dispose()
  }
}, 30_000)

import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
import * as path from "node:path"

const sleep = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis))

const bundle = () =>
  esbuild.build({
    entryPoints: [path.join(import.meta.dirname, "fixtures/scheduler-worker.ts")],
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    external: ["cloudflare:workers", "node:*"],
    alias: {
      "@effect/platform-cloudflare": path.join(import.meta.dirname, "../src")
    }
  }).then((result) => result.outputFiles[0].text)

describe("CloudflareScheduler", () => {
  let miniflare: Miniflare
  const fetch = async (path: string) => {
    const response = await miniflare.dispatchFetch(`http://localhost${path}`)
    assert.strictEqual(response.status, 200)
    return response
  }

  beforeAll(async () => {
    miniflare = new Miniflare({
      modules: [{ type: "ESModule", path: "worker.mjs", contents: await bundle() }],
      compatibilityDate: "2026-07-01",
      compatibilityFlags: ["nodejs_compat"]
    })
  }, 30_000)

  afterAll(() => miniflare?.dispose())

  it("resumes a fiber woken by another request in its owner, which stays open until then", async () => {
    await fetch("/park")
    // The owner has responded and has no work of its own
    await sleep(100)
    assert.deepStrictEqual(await (await fetch("/log")).json(), { log: [], exited: false, timers: 1 })
    await fetch("/wake")
    let body: any
    for (let i = 0; i < 100 && !body?.exited; i++) {
      await sleep(20)
      body = await (await fetch("/log")).json()
    }
    assert.deepStrictEqual(body, { log: [{ store: "owner", io: "owner" }], exited: true, timers: 0 })
  })
})

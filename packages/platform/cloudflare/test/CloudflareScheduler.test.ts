import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare-v5"
import * as path from "node:path"

const sleep = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis))

describe("CloudflareScheduler", () => {
  let miniflare: Miniflare
  const get = (path: string) => miniflare.dispatchFetch(`http://localhost${path}`)
  const json = async (path: string) => {
    const response = await get(path)
    assert.strictEqual(response.status, 200, await response.clone().text())
    return response.json()
  }
  // Waits until `path` responds, then returns its body
  const poll = async (path: string, until: (body: any) => boolean = () => true) => {
    for (let i = 0; i < 100; i++) {
      const response = await get(path)
      const body = response.status === 200 ? await response.json() : await response.arrayBuffer()
      if (response.status === 200 && until(body)) return body
      await sleep(20)
    }
    throw new Error(`${path} did not respond in time`)
  }
  // Request A parks a fiber, then request B wakes it
  const park = async (park: string, wake: string) => {
    const owner = get(park)
    await poll(wake.replace("/wake", "/log"))
    const waker = await json(wake)
    return { owner: await owner, waker }
  }

  const resumed = [
    { at: "resumed", store: "A", io: "owner" },
    { at: "slept", store: "A", io: "owner" }
  ]

  beforeAll(async () => {
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
    miniflare = new Miniflare({
      workers: [{
        config: {
          name: "scheduler",
          manifest: {
            mainModule: "worker.mjs",
            modules: { "worker.mjs": { type: "esm", contents: bundle.outputFiles[0].text } }
          },
          compatibilityDate: "2026-07-01",
          compatibilityFlags: ["nodejs_compat"],
          env: { ROOM: { type: "durable-object", worker: "scheduler", exportName: "Room" } },
          exports: { Room: { type: "durable-object", storage: "sqlite" } }
        }
      }]
    })
  }, 30_000)

  afterAll(() => miniflare?.dispose())

  it("keeps async context when a fiber is woken by its own request", async () => {
    assert.strictEqual(await json("/same"), "X")
  })

  it("resumes a fiber in the request that owns it", async () => {
    const { owner, waker } = await park("/park?id=resume&join", "/wake?id=resume")
    assert.strictEqual(waker, "woken")
    assert.strictEqual(owner.status, 200)
    assert.deepStrictEqual(await owner.json(), resumed)
  })

  it("interrupts a fiber in the request that owns it", async () => {
    const { owner } = await park("/park?id=interrupt&join", "/wake?id=interrupt&interrupt")
    assert.deepStrictEqual(await owner.json(), [{ at: "interrupted", store: "A", io: "owner" }])
  })

  it("lets a waiting owner be cancelled as hung with keepAlive: false", async () => {
    const owner = await get("/park?id=hung&join&scheduler=noKeepAlive")
    assert.strictEqual(owner.status, 500)
    assert.match(await owner.text(), /hung/)
  })

  it("leaves a fiber suspended when its owner has ended", async () => {
    assert.deepStrictEqual(await json("/park?id=ended"), [])
    await sleep(50)
    assert.strictEqual(await json("/wake?id=ended"), "woken")
    await sleep(100)
    assert.deepStrictEqual(await json("/log?id=ended"), { log: [], exited: false })
  })

  it("resumes a Durable Object fiber after its request has ended", async () => {
    assert.deepStrictEqual(await json("/room/park?id=room"), [])
    await sleep(50)
    assert.strictEqual(await json("/room/wake?id=room"), "woken")
    assert.deepStrictEqual(await poll("/room/log?id=room", (body) => body.exited), { log: resumed, exited: true })
  })

  it("initializes a shared runtime from a later request", async () => {
    assert.strictEqual(await json("/runtime/start"), false)
    assert.strictEqual(await json("/runtime/ready"), "ready")
    assert.strictEqual(await poll("/runtime/status", (initialized) => initialized), true)
  })
})

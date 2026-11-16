import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare-v5"
import * as path from "node:path"

const sleep = (millis: number) => new Promise((resolve) => setTimeout(resolve, millis))

const bundle = (stdin?: string) =>
  esbuild.build({
    ...(stdin === undefined
      ? { entryPoints: [path.join(import.meta.dirname, "fixtures/scheduler-worker.ts")] }
      : { stdin: { contents: stdin, resolveDir: import.meta.dirname, loader: "ts" } }),
    bundle: true,
    format: "esm",
    platform: "neutral",
    write: false,
    external: ["cloudflare:workers", "node:*"],
    alias: {
      "@effect/platform-cloudflare": path.join(import.meta.dirname, "../src")
    }
  }).then((result) => result.outputFiles[0].text)

const makeMiniflare = (contents: string, compatibilityDate: string) =>
  new Miniflare({
    workers: [{
      config: {
        name: "scheduler",
        manifest: {
          mainModule: "worker.mjs",
          modules: { "worker.mjs": { type: "esm", contents } }
        },
        compatibilityDate,
        compatibilityFlags: ["nodejs_compat"],
        env: { ROOM: { type: "durable-object", worker: "scheduler", exportName: "Room" } },
        exports: { Room: { type: "durable-object", storage: "sqlite" } }
      }
    }]
  })

// Before 2025-06-16, workerd lets a request enter another request's
// AsyncResource, so owner detection cannot rely on it refusing
describe.each(["2026-07-01", "2025-01-01"])("CloudflareScheduler (compatibility date %s)", (compatibilityDate) => {
  let miniflare: Miniflare
  const get = (path: string) => miniflare.dispatchFetch(`http://localhost${path}`)
  const json = async (path: string) => {
    const response = await get(path)
    assert.strictEqual(response.status, 200, await response.clone().text())
    return response.json()
  }
  // Waits until `path` responds with a body matching `until`
  const poll = async (path: string, until: (body: any) => boolean): Promise<any> => {
    for (let i = 0; i < 250; i++) {
      const response = await get(path)
      const body = response.status === 200 ? await response.json() : await response.arrayBuffer()
      if (response.status === 200 && until(body)) return body
      await sleep(20)
    }
    throw new Error(`${path} did not respond in time`)
  }
  const logged = (count: number) => (body: { log: Array<unknown> }) => body.log.length >= count

  const resumed = [
    { at: "resumed", store: "A", io: "owner" },
    { at: "slept", store: "A", io: "owner" }
  ]

  beforeAll(async () => {
    miniflare = makeMiniflare(await bundle(), compatibilityDate)
  }, 30_000)

  afterAll(() => miniflare?.dispose())

  it("keeps async context when a fiber is woken by its own request", async () => {
    assert.strictEqual(await json("/same"), "X")
  })

  it("keeps a request's fibers running after it responds", async () => {
    assert.deepStrictEqual(await json("/background?id=background"), [])
    assert.deepStrictEqual(await poll("/log?id=background", logged(1)), {
      log: [{ at: "slept", store: "A", io: "owner" }],
      exited: true
    })
  })

  it("resumes a fiber in the request that owns it, after the owner responds", async () => {
    assert.deepStrictEqual(await json("/park?id=resume&work=5000"), [])
    assert.strictEqual(await json("/wake?id=resume"), "woken")
    assert.deepStrictEqual((await poll("/log?id=resume", logged(2))).log, resumed)
  })

  it("resumes a fiber in the request that owns it, while the owner waits for it", async () => {
    const owner = get("/park?id=join&join&work=5000")
    await poll("/log?id=join", () => true)
    assert.strictEqual(await json("/wake?id=join"), "woken")
    const response = await owner
    assert.strictEqual(response.status, 200)
    assert.deepStrictEqual(await response.json(), resumed)
  })

  it("interrupts a fiber in the request that owns it", async () => {
    assert.deepStrictEqual(await json("/park?id=interrupt&work=5000"), [])
    assert.strictEqual(await json("/wake?id=interrupt&interrupt"), "woken")
    assert.deepStrictEqual(await poll("/log?id=interrupt", logged(1)), {
      log: [{ at: "interrupted", store: "A", io: "owner" }],
      exited: true
    })
  })

  it("leaves a fiber suspended when nothing keeps its owner running", async () => {
    // workerd cancels the owner once it only waits on another request
    assert.deepStrictEqual(await json("/park?id=idle"), [])
    await sleep(50)
    assert.strictEqual(await json("/wake?id=idle"), "woken")
    await sleep(100)
    assert.deepStrictEqual(await json("/log?id=idle"), { log: [], exited: false })
  })

  it("resumes a Durable Object fiber after its request has ended", async () => {
    assert.deepStrictEqual(await json("/room/park?id=room"), [])
    await sleep(50)
    assert.strictEqual(await json("/room/wake?id=room"), "woken")
    assert.deepStrictEqual(await poll("/room/log?id=room", (body) => body.exited), { log: resumed, exited: true })
  })

  it("finishes initializing a shared runtime after the request that started it responds", async () => {
    assert.strictEqual(await json("/runtime/start"), false)
    // workerd cancels a request that only waits on another request's work
    const waiter = await get("/runtime/join")
    assert.strictEqual(waiter.status, 500)
    assert.match(await waiter.text(), /hung/)
    assert.strictEqual(await poll("/runtime/status", (initialized) => initialized), true)
    assert.strictEqual(await json("/runtime/join"), "B")
  })
})

describe("CloudflareScheduler without cross-request promise resolution", () => {
  it("cannot be constructed", async () => {
    const worker = await bundle(`
      import { CloudflareScheduler } from "@effect/platform-cloudflare/CloudflareScheduler"
      export class Room {}
      export default {
        fetch() {
          try {
            new CloudflareScheduler()
            return new Response("constructed")
          } catch (error) {
            return new Response(String(error))
          }
        }
      }
    `)
    const miniflare = makeMiniflare(worker, "2024-09-01")
    try {
      const response = await miniflare.dispatchFetch("http://localhost/")
      assert.match(await response.text(), /requires the handle_cross_request_promise_resolution compatibility flag/)
    } finally {
      await miniflare.dispose()
    }
  }, 30_000)
})

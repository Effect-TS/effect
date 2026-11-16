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
  const json = async (path: string): Promise<any> => {
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
      exited: true,
      timers: 0
    })
  })

  // No fixture timers: the owner has no work of its own while its fiber waits
  it("resumes a fiber in an idle owner that has responded, then clears its timer", async () => {
    assert.deepStrictEqual(await json("/park?id=resume"), [])
    await sleep(100)
    assert.deepStrictEqual(await json("/log?id=resume"), { log: [], exited: false, timers: 1 })
    assert.strictEqual(await json("/wake?id=resume"), "woken")
    assert.deepStrictEqual(await poll("/log?id=resume", (body) => body.exited), {
      log: resumed,
      exited: true,
      timers: 0
    })
  })

  it("resumes a fiber in an owner that waits only for it", async () => {
    const owner = get("/park?id=join&join")
    await sleep(100)
    assert.strictEqual(await json("/wake?id=join"), "woken")
    const response = await owner
    assert.strictEqual(response.status, 200, await response.clone().text())
    assert.deepStrictEqual(await response.json(), resumed)
    assert.strictEqual((await json("/log?id=join")).timers, 0)
  })

  it("interrupts a fiber in an idle owner, then clears its timer", async () => {
    assert.deepStrictEqual(await json("/park?id=interrupt"), [])
    await sleep(100)
    assert.strictEqual(await json("/wake?id=interrupt&interrupt"), "woken")
    assert.deepStrictEqual(await poll("/log?id=interrupt", (body) => body.exited), {
      log: [{ at: "interrupted", store: "A", io: "owner" }],
      exited: true,
      timers: 0
    })
  })

  it("resumes a Durable Object fiber after its request has ended", async () => {
    assert.deepStrictEqual(await json("/room/park?id=room"), [])
    await sleep(50)
    assert.strictEqual(await json("/room/wake?id=room"), "woken")
    assert.deepStrictEqual(await poll("/room/log?id=room", (body) => body.exited), {
      log: resumed,
      exited: true,
      timers: 0
    })
  })

  it("serves a request waiting for a shared runtime that other requests initialize", async () => {
    // A starts the initialization and responds, B waits for it, C finishes it
    assert.strictEqual(await json("/runtime/start"), false)
    const waiter = get("/runtime/join")
    await sleep(100)
    assert.strictEqual(await json("/runtime/ready"), "ready")
    const response = await waiter
    assert.strictEqual(response.status, 200, await response.clone().text())
    assert.strictEqual(await response.json(), "B")
    assert.deepStrictEqual(await poll("/runtime/status", (body) => body.timers === 0), {
      initialized: true,
      timers: 0
    })
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

import { afterAll, assert, beforeAll, describe, it } from "@effect/vitest"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
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
    modules: [{ type: "ESModule", path: "worker.mjs", contents }],
    compatibilityDate,
    compatibilityFlags: ["nodejs_compat"]
  })

describe("CloudflareScheduler", () => {
  let miniflare: Miniflare
  const json = async (path: string): Promise<any> => {
    const response = await miniflare.dispatchFetch(`http://localhost${path}`)
    assert.strictEqual(response.status, 200, await response.clone().text())
    return response.json()
  }
  // Waits until `path` responds with a body matching `until`
  const poll = async (path: string, until: (body: any) => boolean): Promise<any> => {
    for (let i = 0; i < 250; i++) {
      const body = await json(path)
      if (until(body)) return body
      await sleep(20)
    }
    throw new Error(`${path} did not respond in time`)
  }

  beforeAll(async () => {
    miniflare = makeMiniflare(await bundle(), "2026-07-01")
  }, 30_000)

  afterAll(() => miniflare?.dispose())

  // The owner has no work of its own while its fiber waits
  it("resumes a fiber in an idle owner that has responded, then clears its timer", async () => {
    assert.deepStrictEqual(await json("/park?id=resume"), [])
    await sleep(100)
    assert.deepStrictEqual(await json("/log?id=resume"), { log: [], exited: false, timers: 1 })
    assert.strictEqual(await json("/wake?id=resume"), "woken")
    assert.deepStrictEqual(await poll("/log?id=resume", (body) => body.exited), {
      log: [
        { at: "resumed", store: "resume", io: "owner" },
        { at: "slept", store: "resume", io: "owner" }
      ],
      exited: true,
      timers: 0
    })
  })

  it("is async and runs queued work in a microtask", async () => {
    assert.deepStrictEqual(await json("/yield"), { executionMode: "async", order: ["fiber", "timer"] })
  })

  // The owner's wake reaction runs after the interrupt has been handed over,
  // while the interrupted fiber waits in its cleanup
  it("runs an interrupted fiber once when its owner wakes it before the interrupt lands", async () => {
    assert.deepStrictEqual(await json("/park?id=run-once&owner-wake"), [])
    await sleep(100)
    assert.strictEqual(await json("/wake?id=run-once&interrupt"), "woken")
    assert.deepStrictEqual(await poll("/log?id=run-once", (body) => body.log.length > 0), {
      log: [{ at: "cleanup", store: "run-once", io: "owner" }],
      exited: false,
      timers: 1
    })
    assert.strictEqual(await json("/wake?id=run-once&finish"), "woken")
    assert.deepStrictEqual(await poll("/log?id=run-once", (body) => body.exited), {
      log: [
        { at: "cleanup", store: "run-once", io: "owner" },
        { at: "cleaned", store: "run-once", io: "owner" },
        { at: "interrupted", store: "run-once", io: "owner" }
      ],
      exited: true,
      timers: 0
    })
  })

  // The fiber is woken, given a scheduler that does not park, then interrupted.
  // Only its next run is the owner's: the cleanup then waits under the other
  // scheduler, with no timer, and nothing returns that wait to the owner.
  it("enters a fiber once in its owner after setContext gives it another scheduler", async () => {
    assert.deepStrictEqual(await json("/park?id=move&owner-wake"), [])
    await sleep(100)
    assert.strictEqual(await json("/wake?id=move&interrupt&move"), "woken")
    assert.deepStrictEqual(await poll("/log?id=move", (body) => body.log.length > 0), {
      log: [{ at: "cleanup", store: "move", io: "owner" }],
      exited: false,
      timers: 0
    })
  })
})

describe("CloudflareScheduler without cross-request promise resolution", () => {
  it("cannot be constructed", async () => {
    const worker = await bundle(`
      import { CloudflareScheduler } from "@effect/platform-cloudflare/CloudflareScheduler"
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

import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
import { fileURLToPath } from "node:url"

const makeWorker = Effect.fnUntraced(function*(fixture: string) {
  const result = yield* Effect.promise(() =>
    esbuild.build({
      entryPoints: [fileURLToPath(new URL(`./fixtures/${fixture}`, import.meta.url))],
      bundle: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      conditions: ["workerd", "worker", "browser"],
      external: ["node:*"],
      write: false
    })
  )
  return yield* Effect.acquireRelease(
    Effect.sync(() =>
      new Miniflare({
        workers: [{
          config: {
            name: "worker",
            compatibilityDate: "2026-09-11",
            compatibilityFlags: ["nodejs_compat"],
            manifest: {
              mainModule: "index.mjs",
              modules: { "index.mjs": { type: "esm", contents: result.outputFiles[0].text } }
            }
          }
        }]
      })
    ),
    (miniflare) => Effect.promise(() => miniflare.dispose())
  )
})

const request = (worker: Miniflare, path: string) =>
  Effect.promise(async () => {
    const response = await worker.dispatchFetch(`http://localhost${path}`)
    return { status: response.status, body: await response.text() }
  }).pipe(Effect.timeoutOrElse({ duration: "10 seconds", orElse: () => Effect.die(`request stalled: ${path}`) }))

// Starts a request that suspends a fiber, then sends `wake` from another
// request until the fiber is ready to be woken.
const waitAndWake = Effect.fnUntraced(function*(worker: Miniflare, wait: string, wake: string) {
  const waiting = yield* Effect.forkChild(request(worker, wait))
  let woken = yield* request(worker, wake)
  while (woken.status === 200 && woken.body === "null") {
    yield* Effect.sleep(10)
    woken = yield* request(worker, wake)
  }
  return { woken, waited: yield* Fiber.join(waiting) }
})

describe("workerd", () => {
  it.live("a fiber woken by another request resumes in its own async context", () =>
    Effect.gen(function*() {
      const worker = yield* makeWorker("workerdWakeup.ts")
      const { waited, woken } = yield* waitAndWake(worker, "/wait?store=request-a", "/wake?store=request-b")

      assert.deepStrictEqual(woken, { status: 200, body: JSON.stringify("request-b") })
      assert.deepStrictEqual(waited, {
        status: 200,
        body: JSON.stringify({ afterWake: "request-a", afterPromise: "request-a" })
      })
    }), { timeout: 60_000 })

  for (const order of ["interrupt-first", "wake-first"] as const) {
    it.live(
      `a fiber interrupted and woken by another request (${order}) finalizes in its own async context`,
      () =>
        Effect.gen(function*() {
          const worker = yield* makeWorker("workerdWakeup.ts")
          const { waited, woken } = yield* waitAndWake(
            worker,
            "/interruptible?store=request-a&keepAlive",
            `/interrupt-and-wake?store=request-b&order=${order}`
          )

          assert.deepStrictEqual(woken, { status: 200, body: JSON.stringify("request-b") })
          assert.deepStrictEqual(waited, {
            status: 200,
            body: JSON.stringify({ interrupted: true, finalizers: ["request-a"] })
          })
        }),
      { timeout: 60_000 }
    )
  }

  it.live(
    "a child forked after a cross-request wake first runs in its parent's async context",
    () =>
      Effect.gen(function*() {
        const worker = yield* makeWorker("workerdWakeup.ts")
        const { waited, woken } = yield* waitAndWake(
          worker,
          "/fork-after-wake?store=request-a&keepAlive",
          "/wake-with-armed-dispatcher?store=request-b"
        )

        assert.deepStrictEqual(woken, { status: 200, body: JSON.stringify("request-b") })
        assert.deepStrictEqual(waited, { status: 200, body: JSON.stringify("request-a") })
      }),
    { timeout: 60_000 }
  )

  it.live(
    "yields and same-tick wakes on a synchronous custom scheduler complete synchronously",
    () =>
      Effect.gen(function*() {
        const worker = yield* makeWorker("workerdWakeup.ts")

        const response = yield* request(worker, "/sync-scheduler?store=request-a")

        assert.deepStrictEqual(response, { status: 200, body: JSON.stringify({ waiter: "waiter", waker: true }) })
      }),
    { timeout: 60_000 }
  )

  it.live(
    "a synchronous custom scheduler cannot resume a fiber from another request, and its own request still can",
    () =>
      Effect.gen(function*() {
        const worker = yield* makeWorker("workerdWakeup.ts")
        const { waited, woken } = yield* waitAndWake(
          worker,
          "/sync-scheduler-wait?store=request-a",
          "/sync-scheduler-wake?store=request-b"
        )

        assert.strictEqual(woken.status, 500, woken.body)
        assert.include(woken.body, "outside of the request in which it was created")
        assert.deepStrictEqual(waited, {
          status: 200,
          body: JSON.stringify({ result: "interrupted", finalizers: ["request-a"] })
        })
      }),
    { timeout: 60_000 }
  )

  it.live(
    "a timer dropped with a finished request does not stall fibers in later requests",
    () =>
      Effect.gen(function*() {
        const worker = yield* makeWorker("workerdWakeup.ts")

        const spinning = yield* request(worker, "/spin?store=request-a")
        const yielded = yield* request(worker, "/yield?store=request-b")

        assert.deepStrictEqual(spinning, { status: 200, body: JSON.stringify("request-a") })
        assert.deepStrictEqual(yielded, { status: 200, body: JSON.stringify("request-b") })
      }),
    { timeout: 60_000 }
  )
})

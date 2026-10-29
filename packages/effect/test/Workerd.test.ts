import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
import { fileURLToPath } from "node:url"

const makeWorker = (fixture: string) =>
  Effect.gen(function*() {
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

describe("workerd", () => {
  it.live("a fiber woken by another request resumes in its own async context", () =>
    Effect.gen(function*() {
      const worker = yield* makeWorker("workerdWakeup.ts")
      const fetch = (path: string) =>
        Effect.promise(async () => {
          const response = await worker.dispatchFetch(`http://localhost${path}`)
          return { status: response.status, body: await response.text() }
        })

      const waiting = yield* Effect.forkChild(fetch("/wait?store=request-a"))
      let woken = yield* fetch("/wake?store=request-b")
      while (woken.status === 200 && woken.body === "null") {
        yield* Effect.sleep(10)
        woken = yield* fetch("/wake?store=request-b")
      }
      const waited = yield* Fiber.join(waiting)

      assert.deepStrictEqual(woken, { status: 200, body: JSON.stringify("request-b") })
      assert.deepStrictEqual(waited, {
        status: 200,
        body: JSON.stringify({ afterWake: "request-a", afterPromise: "request-a" })
      })
    }), { timeout: 60_000 })
})

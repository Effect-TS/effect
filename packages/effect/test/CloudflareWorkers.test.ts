import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as esbuild from "esbuild"
import { Miniflare } from "miniflare"
import { fileURLToPath } from "node:url"

const workerPath = fileURLToPath(new URL("./fixtures/workerdQueueConsumer.ts", import.meta.url))

const bundle = Effect.promise(() =>
  esbuild.build({
    entryPoints: [workerPath],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    conditions: ["workerd", "worker", "browser"],
    write: false
  })
).pipe(Effect.map((result) => result.outputFiles[0].text), Effect.cached, Effect.runSync)

const makeWorker = Effect.gen(function*() {
  const contents = yield* bundle
  return yield* Effect.acquireRelease(
    Effect.sync(() =>
      new Miniflare({
        workers: [{
          config: {
            name: "queue-consumer",
            compatibilityDate: "2026-09-11",
            compatibilityFlags: ["nodejs_compat"],
            manifest: { mainModule: "index.mjs", modules: { "index.mjs": { type: "esm", contents } } }
          }
        }]
      })
    ),
    (miniflare) => Effect.promise(() => miniflare.dispose())
  )
})

// https://github.com/Effect-TS/effect/issues/9025
describe("Cloudflare Workers", () => {
  for (const consumer of ["module-scope", "first-request"] as const) {
    it.live(`a long-lived consumer forked at ${consumer} serves later requests`, () =>
      Effect.gen(function*() {
        const worker = yield* makeWorker
        for (let i = 0; i < 3; i++) {
          const response = yield* Effect.promise(async () => {
            const response = await worker.dispatchFetch(`http://localhost/${consumer}`)
            return { status: response.status, body: await response.text() }
          }).pipe(Effect.timeoutOrElse({ duration: "5 seconds", orElse: () => Effect.die("request stalled") }))
          // workerd answers 500 when it detects that a request can never complete.
          assert.deepStrictEqual(response, { status: 200, body: "served" })
        }
      }), { timeout: 60_000 })
  }
})

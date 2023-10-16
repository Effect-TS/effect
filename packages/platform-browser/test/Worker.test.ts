import "@vitest/web-worker"

import * as Worker from "@effect/platform-browser/Worker"
import { Effect, Stream } from "effect"
import { assert, describe, it } from "vitest"

describe("Worker", () => {
  it("executes streams", () =>
    Effect.gen(function*(_) {
      const pool = yield* _(Worker.makePool<number, never, number>({
        spawn: () => new globalThis.Worker(new URL("./fixtures/worker.ts", import.meta.url)),
        size: 1
      }))
      const items = yield* _(pool.execute(99), Stream.runCollect)
      assert.strictEqual(items.length, 100)
    }).pipe(Effect.scoped, Effect.provide(Worker.layerManager), Effect.runPromise))

  it("SharedWorker", () =>
    Effect.gen(function*(_) {
      const pool = yield* _(Worker.makePool<number, never, number>({
        spawn: () => new globalThis.SharedWorker(new URL("./fixtures/worker.ts", import.meta.url)),
        size: 1
      }))
      const items = yield* _(pool.execute(99), Stream.runCollect)
      assert.strictEqual(items.length, 100)
    }).pipe(Effect.scoped, Effect.provide(Worker.layerManager), Effect.runPromise))
})

import * as Transferable from "@effect/platform/Transferable"
import { Effect, Schema } from "effect"
import { assert, describe, test } from "vitest"

describe("Transferable", () => {
  test("collects transferables", () =>
    Effect.gen(function*(_) {
      const collector = yield* _(Transferable.makeCollector)
      const data = new Uint8Array([1, 2, 3])
      yield* _(
        Schema.encode(Transferable.Uint8Array)(data),
        Effect.provideService(Transferable.Collector, collector)
      )
      assert.deepEqual(collector.unsafeRead(), [data.buffer])
    }).pipe(Effect.runPromise))
})

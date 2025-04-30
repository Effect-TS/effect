import * as Transferable from "@effect/platform/Transferable"
import { describe, test } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Effect, pipe, Schema } from "effect"

describe("Transferable", () => {
  test("collects transferables", () =>
    Effect.gen(function*() {
      const collector = yield* Transferable.makeCollector
      const data = new Uint8Array([1, 2, 3])
      yield* pipe(
        Schema.encode(Transferable.Uint8Array)(data),
        Effect.provideService(Transferable.Collector, collector)
      )
      deepStrictEqual(collector.unsafeRead(), [data.buffer])
    }).pipe(Effect.runPromise))
})

import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Stream from "effect/Stream"
import { deepStrictEqual, strictEqual } from "effect/test/util"

describe("Stream", () => {
  it.effect("onStart", () =>
    Effect.gen(function*() {
      let counter = 0
      const result = yield* pipe(
        Stream.make(1, 1),
        Stream.onStart(Effect.sync(() => counter++)),
        Stream.runCollect
      )
      strictEqual(counter, 1)
      deepStrictEqual(Array.from(result), [1, 1])
    }))

  it.effect("onEnd", () =>
    Effect.gen(function*() {
      let counter = 0
      const result = yield* pipe(
        Stream.make(1, 2, 3),
        Stream.onEnd(Effect.sync(() => counter++)),
        Stream.runCollect
      )
      strictEqual(counter, 1)
      deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
})

import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Ref from "effect/Ref"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  it.effect("all - returns result in the same order", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.all([1, 2, 3].map(Effect.succeed), {
        concurrency: "unbounded"
      }))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("all - returns result in the same order", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.all([1, 2, 3].map(Effect.succeed), {
        concurrency: "unbounded"
      }))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("all - is referentially transparent", () =>
    Effect.gen(function*($) {
      const counter = yield* $(Ref.make(0))
      const op = Ref.getAndUpdate(counter, (n) => n + 1)
      const ops3 = Effect.all([op, op, op], { concurrency: "unbounded" })
      const result = yield* $(ops3, Effect.zip(ops3, { concurrent: true }))
      assert.notDeepEqual(Array.from(result[0]), Array.from(result[1]))
    }))
  it.effect("all - returns results in the same order in parallel", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.all([1, 2, 3].map(Effect.succeed), {
        concurrency: 2
      }))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))
  it.effect("all - preserves failures", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.all(Array.from({ length: 10 }, () => Effect.fail(Cause.RuntimeException())), {
          concurrency: 5,
          discard: true
        }),
        Effect.flip
      )
      assert.deepStrictEqual(result, Cause.RuntimeException())
    }))
})

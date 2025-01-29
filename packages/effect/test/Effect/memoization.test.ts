import { notStrictEqual } from "assert"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Random from "effect/Random"
import * as Ref from "effect/Ref"
import { strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Effect", () => {
  it.effect("non-memoized returns new instances on repeated calls", () =>
    it.flakyTest(Effect.gen(function*($) {
      const random = Random.nextInt
      const [first, second] = yield* $(random, Effect.zip(random))
      notStrictEqual(first, second)
    })))
  it.effect("memoized returns the same instance on repeated calls", () =>
    it.flakyTest(Effect.gen(function*($) {
      const memo = Effect.cached(Random.nextInt)
      const [first, second] = yield* $(memo, Effect.flatMap((effect) => pipe(effect, Effect.zip(effect))))
      strictEqual(first, second)
    })))
  it.effect("memoized function returns the same instance on repeated calls", () =>
    it.flakyTest(Effect.gen(function*($) {
      const randomNumber = (n: number) => Random.nextIntBetween(n, n + n + 1)
      const memoized = yield* $(Effect.cachedFunction(randomNumber))
      const a = yield* $(memoized(10))
      const b = yield* $(memoized(10))
      const c = yield* $(memoized(11))
      const d = yield* $(memoized(11))
      strictEqual(a, b)
      notStrictEqual(b, c)
      strictEqual(c, d)
    })))
  it.effect("once returns an effect that will only be executed once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const effect: Effect.Effect<void> = yield* $(Ref.update(ref, (n) => n + 1), Effect.once)
      yield* $(
        Effect.all(Effect.replicate(effect, 100), {
          concurrency: "unbounded",
          discard: true
        })
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 1)
    }))
})

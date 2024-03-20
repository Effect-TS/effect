import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import { constFalse, constTrue, pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import { assert, describe } from "vitest"

describe("Effect", () => {
  it.effect("succeeds eventually", () =>
    Effect.gen(function*($) {
      const effect = (ref: Ref.Ref<number>) => {
        return pipe(
          Ref.get(ref),
          Effect.flatMap((n) =>
            n < 10 ?
              pipe(Ref.update(ref, (n) => n + 1), Effect.zipRight(Effect.fail("Ouch"))) :
              Effect.succeed(n)
          )
        )
      }
      const ref = yield* $(Ref.make(0))
      const result = yield* $(Effect.eventually(effect(ref)))
      assert.strictEqual(result, 10)
    }))

  it.effect("repeat/until - repeats until condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeat({ until: (n) => n === 0 })
      )
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 10)
    }))

  it.effect("repeat/until - preserves return value", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const result = yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.repeat({ until: (n) => n === 0 })
      )
      assert.strictEqual(result, 0)
    }))

  it.effect("repeat/until - always evaluates effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.repeat({ until: constTrue }))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("repeat/until - repeats until the effectful condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeat({ until: (n) => Effect.succeed(n === 0) })
      )
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 10)
    }))
  it.effect("repeat/until - always evaluates the effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.repeat({ until: () => Effect.succeed(true) }))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("repeat/while - repeats while the condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeat({ while: (n) => n >= 0 })
      )
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 11)
    }))
  it.effect("repeat/while - always evaluates the effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.repeat({ while: constFalse }))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))
  it.effect("repeat/while - repeats while condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.repeat({ while: (v) => Effect.succeed(v >= 0) })
      )
      const result = yield* $(Ref.get(output))
      assert.strictEqual(result, 11)
    }))
  it.effect("repeat/while - always evaluates effect at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.repeat({ while: () => Effect.succeed(false) }))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 1)
    }))

  it.effect("repeat/schedule", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.repeat(Schedule.recurs(3)))
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 4)
    }))

  it.effect("repeat/schedule + until", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.repeat({ schedule: Schedule.recurs(3), until: (n) => n === 3 })
      )
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 3)
    }))

  it.effect("repeat/schedule + while", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.repeat({ schedule: Schedule.recurs(3), while: (n) => n < 3 })
      )
      const result = yield* $(Ref.get(ref))
      assert.strictEqual(result, 3)
    }))
})

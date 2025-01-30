import * as Effect from "effect/Effect"
import { constFalse, constTrue } from "effect/Function"
import * as Ref from "effect/Ref"
import * as Schedule from "effect/Schedule"
import { strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Effect", () => {
  it.effect("retry/until - retries until condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.flipWith(Effect.retry({ until: (n) => n === 0 }))
      )
      const result = yield* $(Ref.get(output))
      strictEqual(result, 10)
    }))
  it.effect("retry/until - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.flipWith(Effect.retry({ until: constTrue })))
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 1)
    }))
  it.effect("retry/until - retries until condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.flipWith(Effect.retry({ until: (n) => Effect.succeed(n === 0) }))
      )
      const result = yield* $(Ref.get(output))
      strictEqual(result, 10)
    }))
  it.effect("retry/until - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.update(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({ until: () => Effect.succeed(true) }))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 1)
    }))
  it.effect("retry/while - retries while condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.flipWith(Effect.retry({ while: (n) => n >= 0 }))
      )
      const result = yield* $(Ref.get(output))
      strictEqual(result, 11)
    }))
  it.effect("retry/while - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(Ref.update(ref, (n) => n + 1), Effect.flipWith(Effect.retry({ while: constFalse })))
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 1)
    }))
  it.effect("retry/while - retries while condition is true", () =>
    Effect.gen(function*($) {
      const input = yield* $(Ref.make(10))
      const output = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(input, (n) => n - 1),
        Effect.zipLeft(Ref.update(output, (n) => n + 1)),
        Effect.flipWith(Effect.retry({ while: (n) => Effect.succeed(n >= 0) }))
      )
      const result = yield* $(Ref.get(output))
      strictEqual(result, 11)
    }))
  it.effect("retry/while - runs at least once", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.update(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({ while: () => Effect.succeed(false) }))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 1)
    }))
  it.effect("retry/schedule", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.update(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry(Schedule.recurs(3)))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 4)
    }))

  it.effect("retry/schedule + until", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({
          schedule: Schedule.recurs(3),
          until: (n) => n === 3
        }))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 3)
    }))

  it.effect("retry/schedule + until effect", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({
          schedule: Schedule.recurs(3),
          until: (n) => Effect.succeed(n === 3)
        }))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 3)
    }))

  it.effect("retry/schedule + until error", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const result = yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({
          schedule: Schedule.recurs(3),
          until: (_n) => Effect.fail("err" as const)
        }))
      )
      strictEqual(result, "err")
    }))

  it.effect("retry/schedule + while", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({
          schedule: Schedule.recurs(3),
          while: (n) => n < 3
        }))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 3)
    }))

  it.effect("retry/schedule + while error", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      const result = yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({
          schedule: Schedule.recurs(3),
          while: (_n) => Effect.fail("err" as const)
        }))
      )
      strictEqual(result, "err")
    }))

  it.effect("retry/schedule + while effect", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make(0))
      yield* $(
        Ref.updateAndGet(ref, (n) => n + 1),
        Effect.flipWith(Effect.retry({
          schedule: Schedule.recurs(3),
          while: (n) => Effect.succeed(n < 3)
        }))
      )
      const result = yield* $(Ref.get(ref))
      strictEqual(result, 3)
    }))
})

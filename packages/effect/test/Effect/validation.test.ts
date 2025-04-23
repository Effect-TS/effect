import { describe, it } from "@effect/vitest"
import { assertLeft, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"

describe("Effect", () => {
  it.effect("validate - fails", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          Effect.succeed(1),
          Effect.validate(Effect.fail(2)),
          Effect.sandbox,
          Effect.either
        )
      )
      assertLeft(result, Cause.fail(2))
    }))
  it.effect("validate - combines both cause", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          Effect.fail(1),
          Effect.validate(Effect.fail(2)),
          Effect.sandbox,
          Effect.either
        )
      )
      deepStrictEqual(result, Either.left(Cause.sequential(Cause.fail(1), Cause.fail(2))))
    }))
  it.effect("validateWith - succeeds", () =>
    Effect.gen(function*() {
      const result = yield* pipe(Effect.succeed(1), Effect.validateWith(Effect.succeed(2), (a, b) => a + b))
      strictEqual(result, 3)
    }))
  it.effect("validateAll - accumulate successes", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const result = yield* pipe(array, Effect.validateAll(Effect.succeed))
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateAll - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, () => 0)
      const result = yield* pipe(array, Effect.validateAll(Effect.fail), Effect.flip)
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateAll - accumulate errors and ignore successes", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const result = yield* (
        pipe(array, Effect.validateAll((n) => n % 2 === 0 ? Effect.succeed(n) : Effect.fail(n)), Effect.flip)
      )
      deepStrictEqual(Array.from(result), [1, 3, 5, 7, 9])
    }))
  it.effect("validateAll/discard - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, () => 0)
      const result = yield* pipe(array, Effect.validateAll(Effect.fail, { discard: true }), Effect.flip)
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateAll/concurrency - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 1000 }, () => 0)
      const result = yield* pipe(array, Effect.validateAll(Effect.fail, { concurrency: "unbounded" }), Effect.flip)
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateAll/concurrency - accumulate errors and ignore successes", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const result = yield* (
        pipe(
          array,
          Effect.validateAll((n) => n % 2 === 0 ? Effect.succeed(n) : Effect.fail(n), {
            concurrency: "unbounded"
          }),
          Effect.flip
        )
      )
      deepStrictEqual(Array.from(result), [1, 3, 5, 7, 9])
    }))
  it.effect("validateAll/concurrency - accumulate successes", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, (_, i) => i)
      const result = yield* pipe(array, Effect.validateAll(Effect.succeed, { concurrency: "unbounded" }))
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateAll/concurrency+discard - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, () => 0)
      const result = yield* pipe(
        array,
        Effect.validateAll(Effect.fail, {
          concurrency: "unbounded",
          discard: true
        }),
        Effect.flip
      )
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateFirst - returns all errors if never valid", () =>
    Effect.gen(function*() {
      const array = Array.from({ length: 10 }, () => 0)
      const result = yield* pipe(array, Effect.validateFirst(Effect.fail), Effect.flip)
      deepStrictEqual(Array.from(result), array)
    }))
  it.effect("validateFirst - returns [] as error if the input is empty", () =>
    Effect.gen(function*() {
      const result = yield* pipe([], Effect.validateFirst(Effect.succeed), Effect.flip)
      deepStrictEqual(result, [])
    }))
  it.effect("validateFirst - runs sequentially and short circuits on first success validation", () =>
    Effect.gen(function*() {
      const f = (n: number): Effect.Effect<number, number> => {
        return n === 6 ? Effect.succeed(n) : Effect.fail(n)
      }
      const array = Array.from({ length: 10 }, (_, i) => i + 1)
      const counter = yield* (Ref.make<number>(0))
      const result = yield* (
        pipe(
          array,
          Effect.validateFirst((n) =>
            pipe(
              Ref.update(counter, (n) => n + 1),
              Effect.zipRight(f(n))
            )
          )
        )
      )
      const count = yield* (Ref.get(counter))
      strictEqual(result, 6)
      strictEqual(count, 6)
    }))
  it.effect("validateFirst - returns errors in correct order", () =>
    Effect.gen(function*() {
      const result = yield* pipe([2, 4, 6, 3, 5, 6], Effect.validateFirst(Effect.fail), Effect.flip)
      deepStrictEqual(Array.from(result), [2, 4, 6, 3, 5, 6])
    }))
  describe("", () => {
    it.effect("validateFirst/concurrency - returns all errors if never valid", () =>
      Effect.gen(function*() {
        const array = Array.from({ length: 1000 }, () => 0)
        const result = yield* pipe(array, Effect.validateFirst(Effect.fail, { concurrency: "unbounded" }), Effect.flip)
        deepStrictEqual(Array.from(result), array)
      }))
    it.effect("validateFirst/concurrency - returns success if valid", () =>
      Effect.gen(function*() {
        const f = (n: number): Effect.Effect<number, number> => {
          return n === 6 ? Effect.succeed(n) : Effect.fail(n)
        }
        const array = Array.from({ length: 10 }, (_, i) => i + 1)
        const result = yield* pipe(array, Effect.validateFirst(f, { concurrency: "unbounded" }))
        strictEqual(result, 6)
      }))
  })
})

import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import { assert, describe } from "vitest"

const exactlyOnce = <R, A, A1>(
  value: A,
  f: (_: Effect.Effect<never, never, A>) => Effect.Effect<R, string, A1>
): Effect.Effect<R, string, A1> => {
  return Effect.gen(function*($) {
    const ref = yield* $(Ref.make(0))
    const res = yield* $(f(pipe(Ref.update(ref, (n) => n + 1), Effect.zipRight(Effect.succeed(value)))))
    const count = yield* $(Ref.get(ref))
    yield* $(count !== 1 ? Effect.fail("Accessed more than once") : Effect.unit)
    return res
  })
}

describe.concurrent("Effect", () => {
  it.effect("filter - filters a collection using an effectual predicate", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<number>>([]))
      const results = yield* $(
        pipe(
          [2, 4, 6, 3, 5, 6],
          Effect.filter((n) => pipe(Ref.update(ref, (ns) => [n, ...ns]), Effect.as(n % 2 === 0)))
        )
      )
      const effects = yield* $(Ref.get(ref))
      assert.deepStrictEqual(Array.from(results), [2, 4, 6, 6])
      assert.deepStrictEqual(Array.from(effects), [2, 4, 6, 3, 5, 6])
    }))
  it.effect("filter/negate - filters a collection using an effectual predicate, removing all elements that satisfy the predicate", () =>
    Effect.gen(function*($) {
      const ref = yield* $(Ref.make<ReadonlyArray<number>>([]))
      const results = yield* $(
        pipe(
          [2, 4, 6, 3, 5, 6],
          Effect.filter((n) => pipe(Ref.update(ref, (ns) => [n, ...ns]), Effect.as(n % 2 === 0)), { negate: true })
        )
      )
      const effects = yield* $(Ref.get(ref))
      assert.deepStrictEqual(Array.from(results), [3, 5])
      assert.deepStrictEqual(Array.from(effects), [2, 4, 6, 3, 5, 6])
    }))
  it.effect("filter/concurrency - filters a collection in parallel using an effectual predicate", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28],
          Effect.filter((n) => Effect.succeed(n % 2 === 0), { concurrency: "unbounded" })
        )
      )
      assert.deepStrictEqual(Array.from(result), [2, 4, 6, 6, 10, 20, 22, 28])
    }))
  it.effect("filter/concurrency+negate - filters a collection in parallel using an effectual predicate, removing all elements that satisfy the predicate", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        pipe(
          [2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28],
          Effect.filter((n) => Effect.succeed(n % 2 === 0), {
            concurrency: "unbounded",
            negate: true
          })
        )
      )
      assert.deepStrictEqual(Array.from(result), [3, 5, 11, 15, 17, 23, 25])
    }))
  it.effect("filterOrElse - returns checked failure from held value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.filterOrElse(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            )
          )),
        Effect.sandbox,
        Effect.either
      )
      const badCase = yield* $(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.filterOrElse(
              (n) => n === 0,
              (n) => Effect.fail(`${n} was not 0`)
            )
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("1 was not 0")))
    }))
  it.effect("filterOrElse - returns checked failure ignoring value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.filterOrElse(
              (n) => n === 0,
              () => Effect.fail("predicate failed!")
            )
          )),
        Effect.sandbox,
        Effect.either
      )
      const badCase = yield* $(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.filterOrElse(
              (n) => n === 0,
              () => Effect.fail("predicate failed!")
            )
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("predicate failed!")))
    }))
  it.effect("filterOrFail - returns failure ignoring value", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.filterOrFail(
              (n) => n === 0,
              () => "predicate failed!"
            )
          )),
        Effect.sandbox,
        Effect.either
      )
      const badCase = yield* $(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.filterOrFail(
              (n) => n === 0,
              () => "predicate failed!"
            )
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("predicate failed!")))
    }))
  it.effect("filterOrFail - returns failure", () =>
    Effect.gen(function*($) {
      const goodCase = yield* $(
        exactlyOnce(0, (effect) =>
          pipe(
            effect,
            Effect.filterOrFail(
              (n) => n === 0,
              (n) => `predicate failed, got ${n}!`
            )
          )),
        Effect.sandbox,
        Effect.either
      )
      const badCase = yield* $(
        exactlyOnce(1, (effect) =>
          pipe(
            effect,
            Effect.filterOrFail(
              (n) => n === 0,
              (n) => `predicate failed, got ${n}!`
            )
          )),
        Effect.sandbox,
        Effect.either,
        Effect.map(Either.mapLeft(Cause.failureOrCause))
      )
      assert.deepStrictEqual(goodCase, Either.right(0))
      assert.deepStrictEqual(badCase, Either.left(Either.left("predicate failed, got 1!")))
    }))
})

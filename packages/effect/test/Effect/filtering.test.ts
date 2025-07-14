import { describe, it } from "@effect/vitest"
import { assertLeft, assertRight, deepStrictEqual } from "@effect/vitest/utils"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Ref from "effect/Ref"
import { strictEqual } from "node:assert"

const exactlyOnce = <R, A, A1>(
  value: A,
  f: (_: Effect.Effect<A>) => Effect.Effect<A1, string, R>
): Effect.Effect<A1, string, R> => {
  return Effect.gen(function*() {
    const ref = yield* (Ref.make(0))
    const res = yield* (f(pipe(Ref.update(ref, (n) => n + 1), Effect.zipRight(Effect.succeed(value)))))
    const count = yield* (Ref.get(ref))
    yield* (count !== 1 ? Effect.fail("Accessed more than once") : Effect.void)
    return res
  })
}

describe("Effect", () => {
  it.effect("filter - filters a collection using an effectual predicate", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<number>>([]))
      const results = yield* (
        pipe(
          [2, 4, 6, 3, 5, 6],
          Effect.filter((n) => pipe(Ref.update(ref, (ns) => [n, ...ns]), Effect.as(n % 2 === 0)))
        )
      )
      const effects = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(results), [2, 4, 6, 6])
      deepStrictEqual(Array.from(effects), [2, 4, 6, 3, 5, 6])
    }))
  it.effect("filter/negate - filters a collection using an effectual predicate, removing all elements that satisfy the predicate", () =>
    Effect.gen(function*() {
      const ref = yield* (Ref.make<ReadonlyArray<number>>([]))
      const results = yield* (
        pipe(
          [2, 4, 6, 3, 5, 6],
          Effect.filter((n) => pipe(Ref.update(ref, (ns) => [n, ...ns]), Effect.as(n % 2 === 0)), { negate: true })
        )
      )
      const effects = yield* (Ref.get(ref))
      deepStrictEqual(Array.from(results), [3, 5])
      deepStrictEqual(Array.from(effects), [2, 4, 6, 3, 5, 6])
    }))
  it.effect("filter/concurrency - filters a collection in parallel using an effectual predicate", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          [2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28],
          Effect.filter((n) => Effect.succeed(n % 2 === 0), { concurrency: "unbounded" })
        )
      )
      deepStrictEqual(Array.from(result), [2, 4, 6, 6, 10, 20, 22, 28])
    }))
  it.effect("filter/concurrency+negate - filters a collection in parallel using an effectual predicate, removing all elements that satisfy the predicate", () =>
    Effect.gen(function*() {
      const result = yield* (
        pipe(
          [2, 4, 6, 3, 5, 6, 10, 11, 15, 17, 20, 22, 23, 25, 28],
          Effect.filter((n) => Effect.succeed(n % 2 === 0), {
            concurrency: "unbounded",
            negate: true
          })
        )
      )
      deepStrictEqual(Array.from(result), [3, 5, 11, 15, 17, 23, 25])
    }))
  it.effect("filterOrElse - returns checked failure from held value", () =>
    Effect.gen(function*() {
      const goodCase = yield* pipe(
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
      const badCase = yield* pipe(
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
      assertRight(goodCase, 0)
      assertLeft(badCase, Either.left("1 was not 0"))
    }))
  it.effect("filterOrElse - returns checked failure ignoring value", () =>
    Effect.gen(function*() {
      const goodCase = yield* pipe(
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
      const badCase = yield* pipe(
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
      assertRight(goodCase, 0)
      assertLeft(badCase, Either.left("predicate failed!"))
    }))
  it.effect("filterOrFail - returns failure ignoring value", () =>
    Effect.gen(function*() {
      const goodCase = yield* pipe(
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
      const badCase = yield* pipe(
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
      assertRight(goodCase, 0)
      assertLeft(badCase, Either.left("predicate failed!"))
    }))
  it.effect("filterOrFail - returns failure", () =>
    Effect.gen(function*() {
      const goodCase = yield* pipe(
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
      const badCase = yield* pipe(
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
      assertRight(goodCase, 0)
      assertLeft(badCase, Either.left("predicate failed, got 1!"))
    }))

  it.effect("filterOrFail - without orFailWith", () =>
    Effect.gen(function*() {
      const goodCase = yield* pipe(
        Effect.succeed(0),
        Effect.filterOrFail((n) => n === 0)
      )
      const goodCaseDataFirst = yield* Effect.filterOrFail(Effect.succeed(0), (n) => n === 0)
      const badCase = yield* pipe(
        Effect.succeed(1),
        Effect.filterOrFail((n) => n === 0),
        Effect.flip
      )
      deepStrictEqual(goodCase, 0)
      deepStrictEqual(goodCaseDataFirst, 0)
      deepStrictEqual(badCase, new Cause.NoSuchElementException())
    }))

  describe("filterEffectOrElse", () => {
    it.effect("executes fallback", () =>
      Effect.gen(function*() {
        const result = yield* Effect.succeed(1).pipe(
          Effect.filterEffectOrElse({
            predicate: (n) => Effect.succeed(n === 0),
            orElse: () => Effect.succeed(0)
          })
        )
        strictEqual(result, 0)
      }))
  })

  describe("filterEffectOrFails", () => {
    it.effect("executes orFailWith", () =>
      Effect.gen(function*() {
        const result = yield* Effect.succeed(1).pipe(
          Effect.filterEffectOrElse({
            predicate: (n) => Effect.succeed(n === 0),
            orElse: () => Effect.fail("boom")
          }),
          Effect.flip
        )
        strictEqual(result, "boom")
      }))
  })
})

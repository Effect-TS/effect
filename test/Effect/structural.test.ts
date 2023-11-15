import * as it from "effect-test/utils/extend"
import { assertType, satisfies } from "effect-test/utils/types"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { assert, describe } from "vitest"

describe.concurrent("Effect", () => {
  describe("all", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([]))
        assert.deepEqual(x, [])
        satisfies<true>(assertType<[]>()(x))
      }))
    it.effect("should work with an array argument", () =>
      Effect.gen(function*($) {
        const y = Effect.all([0, 1, 2].map((n) => Effect.succeed(n + 1)))
        const x = yield* $(y)
        assert.deepEqual(x, [1, 2, 3])
        satisfies<true>(assertType<Array<number>>()(x))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: number
          }>()(result)
        )
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)])))
        assert.deepEqual(result, [0, 1])
        satisfies<true>(assertType<Array<number>>()(result))
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}))
        assert.deepEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
  })
  describe("all/ concurrency", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], {
          concurrency: "unbounded"
        }))
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([], {
          concurrency: "unbounded"
        }))
        assert.deepEqual(x, [])
        satisfies<true>(assertType<[]>()(x))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, {
          concurrency: "unbounded"
        }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(
          assertType<{
            a: number
            b: number
          }>()(result)
        )
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}, { concurrency: "unbounded" }))
        assert.deepEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
  })
  describe("all/ validate mode", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], { mode: "validate" }))
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.flip(Effect.all([Effect.fail(0), Effect.succeed(1)], { mode: "validate" })))
        assert.deepEqual(res, [Option.some(0), Option.none()])
        satisfies<true>(assertType<[Option.Option<number>, Option.Option<never>]>()(res))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, { mode: "validate" }))
        const { a, b } = result
        assert.deepEqual(a, 0)
        assert.deepEqual(b, 1)
        satisfies<true>(
          assertType<{
            readonly a: number
            readonly b: number
          }>()(result)
        )
      }))
    it.effect("failure should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          Effect.flip(Effect.all({ a: Effect.fail(0), b: Effect.succeed(1) }, { mode: "validate" }))
        )
        const { a, b } = result
        assert.deepEqual(a, Option.some(0))
        assert.deepEqual(b, Option.none())
        satisfies<true>(
          assertType<{
            readonly a: Option.Option<number>
            readonly b: Option.Option<never>
          }>()(result)
        )
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)]), { mode: "validate" }))
        assert.deepEqual(result, [0, 1])
        satisfies<true>(assertType<Array<number>>()(result))
      }))
  })
  describe("all/ either mode", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], { mode: "either" }))
        assert.deepEqual(res, [Either.right(0), Either.right(1)])
        satisfies<true>(assertType<[Either.Either<never, number>, Either.Either<never, number>]>()(res))
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.fail(0), Effect.succeed(1)], { mode: "either" }))
        assert.deepEqual(res, [Either.left(0), Either.right(1)])
        satisfies<true>(assertType<[Either.Either<number, never>, Either.Either<never, number>]>()(res))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, { mode: "either" }))
        const { a, b } = result
        assert.deepEqual(a, Either.right(0))
        assert.deepEqual(b, Either.right(1))
        satisfies<true>(
          assertType<{
            readonly a: Either.Either<never, number>
            readonly b: Either.Either<never, number>
          }>()(result)
        )
      }))
    it.effect("failure should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          Effect.all({ a: Effect.fail(0), b: Effect.succeed(1) }, { mode: "either" })
        )
        const { a, b } = result
        assert.deepEqual(a, Either.left(0))
        assert.deepEqual(b, Either.right(1))
        satisfies<true>(
          assertType<{
            readonly a: Either.Either<number, never>
            readonly b: Either.Either<never, number>
          }>()(result)
        )
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)]), { mode: "either" }))
        assert.deepEqual(result, [Either.right(0), Either.right(1)])
        satisfies<true>(assertType<Array<Either.Either<never, number>>>()(result))
      }))
  })
  describe("allWith", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(
          [Effect.succeed(0), Effect.succeed(1)] as const,
          Effect.allWith()
        )
        assert.deepEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
  })
})

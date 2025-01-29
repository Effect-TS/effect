import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { deepStrictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { assertType, satisfies } from "effect/test/utils/types"
import { describe } from "vitest"

describe("Effect", () => {
  describe("all", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        deepStrictEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([]))
        deepStrictEqual(x, [])
        satisfies<true>(assertType<[]>()(x))
      }))
    it.effect("should work with an array argument", () =>
      Effect.gen(function*($) {
        const y = Effect.all([0, 1, 2].map((n) => Effect.succeed(n + 1)))
        const x = yield* $(y)
        deepStrictEqual(x, [1, 2, 3])
        satisfies<true>(assertType<Array<number>>()(x))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        const { a, b } = result
        deepStrictEqual(a, 0)
        deepStrictEqual(b, 1)
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
        deepStrictEqual(result, [0, 1])
        satisfies<true>(assertType<Array<number>>()(result))
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all({}))
        deepStrictEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
  })
  describe("all/ concurrency", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], {
          concurrency: "unbounded"
        }))
        deepStrictEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*($) {
        const x = yield* $(Effect.all([], {
          concurrency: "unbounded"
        }))
        deepStrictEqual(x, [])
        satisfies<true>(assertType<[]>()(x))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, {
          concurrency: "unbounded"
        }))
        const { a, b } = result
        deepStrictEqual(a, 0)
        deepStrictEqual(b, 1)
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
        deepStrictEqual(x, {})
        satisfies<true>(assertType<{}>()(x))
      }))
  })
  describe("all/ validate mode", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], { mode: "validate" }))
        deepStrictEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.flip(Effect.all([Effect.fail(0), Effect.succeed(1)], { mode: "validate" })))
        deepStrictEqual(res, [Option.some(0), Option.none()])
        satisfies<true>(assertType<[Option.Option<number>, Option.Option<never>]>()(res))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, { mode: "validate" }))
        const { a, b } = result
        deepStrictEqual(a, 0)
        deepStrictEqual(b, 1)
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
        deepStrictEqual(a, Option.some(0))
        deepStrictEqual(b, Option.none())
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
        deepStrictEqual(result, [0, 1])
        satisfies<true>(assertType<Array<number>>()(result))
      }))
  })
  describe("all/ either mode", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.succeed(0), Effect.succeed(1)], { mode: "either" }))
        deepStrictEqual(res, [Either.right(0), Either.right(1)])
        satisfies<true>(assertType<[Either.Either<number>, Either.Either<number>]>()(res))
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(Effect.all([Effect.fail(0), Effect.succeed(1)], { mode: "either" }))
        deepStrictEqual(res, [Either.left(0), Either.right(1)])
        satisfies<true>(assertType<[Either.Either<never, number>, Either.Either<number>]>()(res))
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, { mode: "either" }))
        const { a, b } = result
        deepStrictEqual(a, Either.right(0))
        deepStrictEqual(b, Either.right(1))
        satisfies<true>(
          assertType<{
            readonly a: Either.Either<number>
            readonly b: Either.Either<number>
          }>()(result)
        )
      }))
    it.effect("failure should work with one record argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(
          Effect.all({ a: Effect.fail(0), b: Effect.succeed(1) }, { mode: "either" })
        )
        const { a, b } = result
        deepStrictEqual(a, Either.left(0))
        deepStrictEqual(b, Either.right(1))
        satisfies<true>(
          assertType<{
            readonly a: Either.Either<never, number>
            readonly b: Either.Either<number>
          }>()(result)
        )
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*($) {
        const result = yield* $(Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)]), { mode: "either" }))
        deepStrictEqual(result, [Either.right(0), Either.right(1)])
        satisfies<true>(assertType<Array<Either.Either<number>>>()(result))
      }))
  })
  describe("allWith", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*($) {
        const res = yield* $(
          [Effect.succeed(0), Effect.succeed(1)] as const,
          Effect.allWith()
        )
        deepStrictEqual(res, [0, 1])
        satisfies<true>(assertType<[number, number]>()(res))
      }))
  })
})

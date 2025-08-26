import { describe, it } from "@effect/vitest"
import { assertLeft, assertNone, assertRight, assertSome, deepStrictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"

describe("Effect", () => {
  describe("all", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* (Effect.all([Effect.succeed(0), Effect.succeed(1)]))
        deepStrictEqual(res, [0, 1])
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*() {
        const x = yield* (Effect.all([]))
        deepStrictEqual(x, [])
      }))
    it.effect("should work with an array argument", () =>
      Effect.gen(function*() {
        const y = Effect.all([0, 1, 2].map((n) => Effect.succeed(n + 1)))
        const x = yield* y
        deepStrictEqual(x, [1, 2, 3])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }))
        const { a, b } = result
        deepStrictEqual(a, 0)
        deepStrictEqual(b, 1)
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)])))
        deepStrictEqual(result, [0, 1])
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*() {
        const x = yield* (Effect.all({}))
        deepStrictEqual(x, {})
      }))
  })
  describe("all/ concurrency", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* (Effect.all([Effect.succeed(0), Effect.succeed(1)], {
          concurrency: "unbounded"
        }))
        deepStrictEqual(res, [0, 1])
      }))
    it.effect("should work with one empty array argument", () =>
      Effect.gen(function*() {
        const x = yield* (Effect.all([], {
          concurrency: "unbounded"
        }))
        deepStrictEqual(x, [])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, {
          concurrency: "unbounded"
        }))
        const { a, b } = result
        deepStrictEqual(a, 0)
        deepStrictEqual(b, 1)
      }))
    it.effect("should work with one empty record", () =>
      Effect.gen(function*() {
        const x = yield* (Effect.all({}, { concurrency: "unbounded" }))
        deepStrictEqual(x, {})
      }))
  })
  describe("all/ validate mode", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* (Effect.all([Effect.succeed(0), Effect.succeed(1)], { mode: "validate" }))
        deepStrictEqual(res, [0, 1])
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* (Effect.flip(Effect.all([Effect.fail(0), Effect.succeed(1)], { mode: "validate" })))
        deepStrictEqual(res, [Option.some(0), Option.none()])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, { mode: "validate" }))
        const { a, b } = result
        deepStrictEqual(a, 0)
        deepStrictEqual(b, 1)
      }))
    it.effect("failure should work with one record argument", () =>
      Effect.gen(function*() {
        const result = yield* (
          Effect.flip(Effect.all({ a: Effect.fail(0), b: Effect.succeed(1) }, { mode: "validate" }))
        )
        const { a, b } = result
        assertSome(a, 0)
        assertNone(b)
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)]), { mode: "validate" }))
        deepStrictEqual(result, [0, 1])
      }))
  })
  describe("all/ either mode", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* (Effect.all([Effect.succeed(0), Effect.succeed(1)], { mode: "either" }))
        deepStrictEqual(res, [Either.right(0), Either.right(1)])
      }))
    it.effect("failure should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* (Effect.all([Effect.fail(0), Effect.succeed(1)], { mode: "either" }))
        deepStrictEqual(res, [Either.left(0), Either.right(1)])
      }))
    it.effect("should work with one record argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all({ a: Effect.succeed(0), b: Effect.succeed(1) }, { mode: "either" }))
        const { a, b } = result
        assertRight(a, 0)
        assertRight(b, 1)
      }))
    it.effect("failure should work with one record argument", () =>
      Effect.gen(function*() {
        const result = yield* (
          Effect.all({ a: Effect.fail(0), b: Effect.succeed(1) }, { mode: "either" })
        )
        const { a, b } = result
        assertLeft(a, 0)
        assertRight(b, 1)
      }))
    it.effect("should work with one iterable argument", () =>
      Effect.gen(function*() {
        const result = yield* (Effect.all(new Set([Effect.succeed(0), Effect.succeed(1)]), { mode: "either" }))
        deepStrictEqual(result, [Either.right(0), Either.right(1)])
      }))
  })
  describe("allWith", () => {
    it.effect("should work with one array argument", () =>
      Effect.gen(function*() {
        const res = yield* pipe(
          [Effect.succeed(0), Effect.succeed(1)] as const,
          Effect.allWith()
        )
        deepStrictEqual(res, [0, 1])
      }))
  })
})

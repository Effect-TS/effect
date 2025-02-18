import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Option from "effect/Option"

describe("Effect", () => {
  describe("transposeOption", () => {
    it.effect("None", () =>
      Effect.gen(function*() {
        const result = yield* Effect.transposeOption(Option.none())
        assert.ok(Option.isNone(result))
      }))

    it.effect("Some", () =>
      Effect.gen(function*() {
        const result = yield* Effect.transposeOption(Option.some(Effect.succeed(42)))
        assert.deepStrictEqual(result, Option.some(42))
      }))
  })
})

describe("Either", () => {
  describe("transposeOption", () => {
    it.effect("None", () =>
      Effect.gen(function*() {
        const result = yield* Either.transposeOption(Option.none())
        assert.ok(Option.isNone(result))
      }))

    it.effect("Some", () =>
      Effect.gen(function*() {
        const result = yield* Either.transposeOption(Option.some(Either.right(42)))
        assert.deepStrictEqual(result, Option.some(42))
      }))
  })
})

import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"

describe("Effect", () => {
  describe("fromOption", () => {
    it.effect("succeeds with value when Option is Some", () =>
      Effect.gen(function*() {
        const value = yield* Effect.fromOption(Option.some(1))
        assert.strictEqual(value, 1)
      }))

    it.effect("fails with NoSuchElementException when Option is None", () =>
      Effect.gen(function*() {
        const result = yield* Effect.fromOption(Option.none()).pipe(Effect.flip)
        assert.ok(Cause.isNoSuchElementException(result))
      }))
  })

  describe("fromOptionOrElse", () => {
    it.effect("succeeds with value when Option is Some", () =>
      Effect.gen(function*() {
        class CustomError {
          readonly _tag = "CustomError"
        }
        const value = yield* Effect.fromOptionOrElse(Option.some(1), () => new CustomError())
        assert.strictEqual(value, 1)
      }))

    it.effect("fails with custom error when Option is None", () =>
      Effect.gen(function*() {
        class CustomError {
          readonly _tag = "CustomError"
        }
        const result = yield* Effect.fromOptionOrElse(Option.none(), () => new CustomError()).pipe(Effect.flip)
        assert.strictEqual(result._tag, "CustomError")
      }))

    it.effect("supports data-last variant", () =>
      Effect.gen(function*() {
        class CustomError {
          readonly _tag = "CustomError"
        }
        const value = yield* pipe(Option.some(2), Effect.fromOptionOrElse(() => new CustomError()))
        assert.strictEqual(value, 2)
      }))
  })

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
  describe("transposeMapOption", () => {
    describe("None", () => {
      it.effect("Success", () =>
        Effect.gen(function*() {
          const resultDataFirst = yield* Effect.transposeMapOption(Option.none(), () => Effect.succeed(42))
          assert.ok(Option.isNone(resultDataFirst))

          const resultDataLast = yield* pipe(
            Option.none(),
            Effect.transposeMapOption(() => Effect.succeed(42))
          )
          assert.ok(Option.isNone(resultDataLast))
        }))
      it.effect("Failure", () =>
        Effect.gen(function*() {
          const resultDataFirst = yield* Effect.transposeMapOption(Option.none(), () => Effect.fail("Error"))
          assert.ok(Option.isNone(resultDataFirst))

          const resultDataLast = yield* pipe(
            Option.none(),
            Effect.transposeMapOption(() => Effect.fail("Error"))
          )
          assert.ok(Option.isNone(resultDataLast))
        }))
    })

    describe("Some", () => {
      describe("None", () => {
        it.effect("Success", () =>
          Effect.gen(function*() {
            const resultDataFirst = yield* Effect.transposeMapOption(Option.some(42), (value) =>
              Effect.succeed(value * 2))
            assert.deepStrictEqual(resultDataFirst, Option.some(84))

            const resultDataLast = yield* pipe(
              Option.some(42),
              Effect.transposeMapOption((value) =>
                Effect.succeed(value * 2)
              )
            )
            assert.deepStrictEqual(resultDataLast, Option.some(84))
          }))
        it.effect("Failure", () =>
          Effect.gen(function*() {
            const resultDataFirst = yield* pipe(
              Effect.transposeMapOption(Option.some(42), () => Effect.fail("error")),
              Effect.flip
            )
            assert.equal(resultDataFirst, "error")

            const resultDataLast = yield* pipe(
              Option.some(42),
              Effect.transposeMapOption(() => Effect.fail("error")),
              Effect.flip
            )
            assert.equal(resultDataLast, "error")
          }))
      })
    })
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

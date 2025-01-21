import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as it from "effect/test/utils/extend"
import { assert, describe } from "vitest"

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

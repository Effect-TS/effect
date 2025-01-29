import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { deepStrictEqual, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

describe("Effect", () => {
  const add = (a: number) => (b: number) => a + b

  it.effect("two successes should succeed", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.succeed(add).pipe(Effect.ap(Effect.succeed(1)), Effect.ap(Effect.succeed(2))))
      strictEqual(result, 3)
    }))

  it.effect("one failure in data-last position should fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.succeed(add).pipe(Effect.ap(Effect.succeed(1)), Effect.ap(Effect.fail("c"))),
        Effect.either
      )
      deepStrictEqual(result, Either.left("c"))
    }))

  it.effect("one failure in data-first position should fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Effect.succeed(add).pipe(Effect.ap(Effect.fail("b")), Effect.ap(Effect.fail("c"))),
        Effect.either
      )
      deepStrictEqual(result, Either.left("b"))
    }))

  it.effect("an applicative operation that starts with a failure should fail", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        (Effect.fail("a") as Effect.Effect<typeof add, string>).pipe(
          Effect.ap(Effect.succeed(1)),
          Effect.ap(Effect.succeed(2))
        ),
        Effect.either
      )
      deepStrictEqual(result, Either.left("a"))
    }))
})

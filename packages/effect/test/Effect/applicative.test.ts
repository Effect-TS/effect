import { describe, it } from "@effect/vitest"
import { assertLeft, strictEqual } from "@effect/vitest/utils"
import { Effect, pipe } from "effect"

describe("Effect", () => {
  const add = (a: number) => (b: number) => a + b

  it.effect("two successes should succeed", () =>
    Effect.gen(function*() {
      const result = yield* (Effect.succeed(add).pipe(Effect.ap(Effect.succeed(1)), Effect.ap(Effect.succeed(2))))
      strictEqual(result, 3)
    }))

  it.effect("one failure in data-last position should fail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed(add).pipe(Effect.ap(Effect.succeed(1)), Effect.ap(Effect.fail("c"))),
        Effect.either
      )
      assertLeft(result, "c")
    }))

  it.effect("one failure in data-first position should fail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed(add).pipe(Effect.ap(Effect.fail("b")), Effect.ap(Effect.fail("c"))),
        Effect.either
      )
      assertLeft(result, "b")
    }))

  it.effect("an applicative operation that starts with a failure should fail", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        (Effect.fail("a") as Effect.Effect<typeof add, string>).pipe(
          Effect.ap(Effect.succeed(1)),
          Effect.ap(Effect.succeed(2))
        ),
        Effect.either
      )
      assertLeft(result, "a")
    }))
})

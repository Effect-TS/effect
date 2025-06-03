import { describe, it } from "@effect/vitest"
import { assertLeft, strictEqual } from "@effect/vitest/utils"
import { Effect, Option, pipe } from "effect"

describe("Effect", () => {
  it.effect("failWith - unwraps the value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Option.some(1).pipe(Effect.failWith(() => new Error()))
      )
      strictEqual(result, 1)
    }))

  it.effect("failWith - errors on empty", () =>
    Effect.gen(function*() {
      const error = new Error()
      const result = yield* pipe(
        Option.none().pipe(Effect.failWith(() => error)),
        Effect.either
      )
      assertLeft(result, error)
    }))

  it.effect("failWithM - unwraps the value", () =>
    Effect.gen(function*() {
      const result = yield* pipe(
        Effect.succeed(Option.some(1)).pipe(Effect.failWithM(() => new Error()))
      )
      strictEqual(result, 1)
    }))

  it.effect("failWithM - errors on empty", () =>
    Effect.gen(function*() {
      const error = new Error()
      const result = yield* pipe(
        Effect.succeed(Option.none()).pipe(Effect.failWithM(() => error)),
        Effect.either
      )
      assertLeft(result, error)
    }))
})

import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import { nextInt } from "effect/Random"
import { unify } from "effect/Unify"
import { assert, describe } from "vitest"

describe.concurrent("Foreign", () => {
  it.effect("Unify", () =>
    Effect.gen(function*($) {
      const unifiedEffect = unify((yield* $(nextInt)) > 1 ? Effect.succeed(0) : Effect.fail(1))
      const unifiedExit = unify((yield* $(nextInt)) > 1 ? Exit.succeed(0) : Exit.fail(1))
      const unifiedEither = unify((yield* $(nextInt)) > 1 ? Either.right(0) : Either.left(1))
      const unifiedOption = unify((yield* $(nextInt)) > 1 ? Option.some(0) : Option.none())
      assert.deepEqual(yield* $(unifiedEffect), 0)
      assert.deepEqual(yield* $(unifiedExit), 0)
      assert.deepEqual(yield* $(unifiedEither), 0)
      assert.deepEqual(yield* $(unifiedOption), 0)
    }))
  it.effect("Tag", () =>
    Effect.gen(function*($) {
      const tag = Context.Tag<number>()
      const result = yield* $(tag, Effect.provideService(tag, 10))
      assert.deepEqual(result, 10)
    }))
  it.effect("Either", () =>
    Effect.gen(function*($) {
      const a = yield* $(Either.right(10))
      const b = yield* $(Effect.either(Either.left(10)))
      const c = yield* $(
        Either.right(2),
        Effect.flatMap(
          (n) => Effect.succeed(n + 1)
        )
      )
      assert.deepEqual(a, 10)
      assert.deepEqual(b, Either.left(10))
      assert.deepEqual(c, 3)
    }))
  it.effect("Option", () =>
    Effect.gen(function*($) {
      const a = yield* $(Option.some(10))
      const b = yield* $(Effect.either(Option.none()))
      const c = yield* $(
        Option.some(2),
        Effect.flatMap(
          (n) => Effect.succeed(n + 1)
        )
      )
      assert.deepEqual(a, 10)
      assert.deepEqual(b, Either.left(new Cause.NoSuchElementException()))
      assert.deepEqual(c, 3)
    }))
})

import * as Util from "effect-test/util"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import { describe, it } from "vitest"

const expectRight = <R, L>(e: Effect.Effect<R, L>, expected: R) => {
  Util.deepStrictEqual(Effect.runSync(Effect.either(e)), Either.right(expected))
}

const expectLeft = <R, L>(e: Effect.Effect<R, L>, expected: L) => {
  Util.deepStrictEqual(Effect.runSync(Effect.either(e)), Either.left(expected))
}

describe("do notation", () => {
  it("Do", () => {
    expectRight(Effect.Do, {})
  })

  it("bindTo", () => {
    expectRight(pipe(Effect.succeed(1), Effect.bindTo("a")), { a: 1 })
    expectLeft(pipe(Effect.fail("left"), Effect.bindTo("a")), "left")
  })

  it("bind", () => {
    expectRight(pipe(Effect.succeed(1), Effect.bindTo("a"), Effect.bind("b", ({ a }) => Effect.succeed(a + 1))), {
      a: 1,
      b: 2
    })
    expectLeft(
      pipe(Effect.succeed(1), Effect.bindTo("a"), Effect.bind("b", () => Effect.fail("left"))),
      "left"
    )
    expectLeft(
      pipe(Effect.fail("left"), Effect.bindTo("a"), Effect.bind("b", () => Effect.succeed(2))),
      "left"
    )
  })

  it("let", () => {
    expectRight(pipe(Effect.succeed(1), Effect.bindTo("a"), Effect.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
    expectLeft(
      pipe(Effect.fail("left"), Effect.bindTo("a"), Effect.let("b", () => 2)),
      "left"
    )
  })
})

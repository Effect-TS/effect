import { describe, it } from "@effect/vitest"
import * as Util from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import type { NoExcessProperties } from "effect/Types"

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
    expectRight(
      pipe(
        Effect.succeed(1),
        Effect.bindTo("__proto__"),
        Effect.bind("x", () => Effect.succeed(2))
      ),
      { x: 2, ["__proto__"]: 1 }
    )
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
    expectRight(
      pipe(
        Effect.Do,
        Effect.bind("__proto__", () => Effect.succeed(1)),
        Effect.bind("b", ({ __proto__ }) => Effect.succeed(2))
      ),
      { b: 2, ["__proto__"]: 1 }
    )
  })

  it("let", () => {
    expectRight(pipe(Effect.succeed(1), Effect.bindTo("a"), Effect.let("b", ({ a }) => a + 1)), { a: 1, b: 2 })
    expectLeft(
      pipe(Effect.fail("left"), Effect.bindTo("a"), Effect.let("b", () => 2)),
      "left"
    )
    expectRight(
      pipe(
        Effect.succeed(1),
        Effect.bindTo("a"),
        Effect.let("__proto__", ({ a }) => a + 1),
        Effect.bind("x", () => Effect.succeed(3))
      ),
      { a: 1, x: 3, ["__proto__"]: 2 }
    )
  })

  describe("bindAll", () => {
    it("succeed", () => {
      const getTest = <O extends NoExcessProperties<{ mode: "default" | "either" | "validate" }, O>>(options: O) =>
        Effect.Do.pipe(
          Effect.bind("x", () => Effect.succeed(2)),
          Effect.bindAll(({ x }) => ({
            a: Effect.succeed(x),
            b: Effect.succeed("ops")
          }), options)
        )

      expectRight(getTest({ mode: "default" }), {
        a: 2,
        b: "ops",
        x: 2
      })

      expectRight(getTest({ mode: "either" }), {
        a: Either.right(2),
        b: Either.right("ops"),
        x: 2
      })

      expectRight(getTest({ mode: "validate" }), {
        a: 2,
        b: "ops",
        x: 2
      })
    })

    it("with failure", () => {
      const getTest = <O extends NoExcessProperties<{ mode: "default" | "either" | "validate" }, O>>(options: O) =>
        Effect.Do.pipe(
          Effect.bind("x", () => Effect.succeed(2)),
          Effect.bindAll(({ x }) => ({
            a: Effect.fail(x), // <-- fail
            b: Effect.succeed("ops")
          }), options)
        )

      expectLeft(getTest({ mode: "default" }), 2)
      expectRight(getTest({ mode: "either" }), {
        a: Either.left(2),
        b: Either.right("ops"),
        x: 2
      })

      expectLeft(getTest({ mode: "validate" }), {
        a: Option.some(2),
        b: Option.none()
      })
    })
  })
})

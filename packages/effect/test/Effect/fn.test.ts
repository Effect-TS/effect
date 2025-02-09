import { describe, it } from "@effect/vitest"
import { Cause, Effect } from "effect"
import { assertEquals, assertInstanceOf, assertTrue, strictEqual } from "effect/test/util"

describe("Effect.fn", () => {
  it.effect("catches defects in the function", () =>
    Effect.gen(function*() {
      let caught: Cause.Cause<never> | undefined
      const fn = Effect.fn("test")(
        (): Effect.Effect<void> => {
          throw new Error("test")
        },
        Effect.tapErrorCause((cause) => {
          caught = cause
          return Effect.void
        })
      )
      const cause = yield* fn().pipe(
        Effect.sandbox,
        Effect.flip
      )
      assertTrue(Cause.isDieType(cause))
      assertInstanceOf(cause.defect, Error)
      strictEqual(cause.defect.message, "test")
      strictEqual(caught, cause)
    }))

  it.effect("catches defects in pipeline", () =>
    Effect.gen(function*() {
      const fn = Effect.fn("test")(
        () => Effect.void,
        (_): Effect.Effect<void> => {
          throw new Error("test")
        }
      )
      const cause = yield* fn().pipe(
        Effect.sandbox,
        Effect.flip
      )
      assertTrue(Cause.isDieType(cause))
      assertInstanceOf(cause.defect, Error)
      strictEqual(cause.defect.message, "test")
    }))

  it.effect("catches defects in both fn & pipeline", () =>
    Effect.gen(function*() {
      const fn = Effect.fn("test")(
        (): Effect.Effect<void> => {
          throw new Error("test")
        },
        (_): Effect.Effect<void> => {
          throw new Error("test2")
        }
      )
      const cause = yield* fn().pipe(
        Effect.sandbox,
        Effect.flip
      )
      assertTrue(Cause.isSequentialType(cause))
      assertTrue(Cause.isDieType(cause.left))
      assertTrue(Cause.isDieType(cause.right))
      assertInstanceOf(cause.left.defect, Error)
      strictEqual(cause.left.defect.message, "test")
      assertInstanceOf(cause.right.defect, Error)
      strictEqual(cause.right.defect.message, "test2")
    }))

  it.effect("can access args in single pipe", () =>
    Effect.gen(function*() {
      const fn = Effect.fn("test")(
        function*(n: number) {
          return n
        },
        (effect, n) => Effect.map(effect, (a) => a + n),
        (effect, n) => Effect.map(effect, (a) => a + n)
      )
      const n = yield* fn(1)
      assertEquals(n, 3)
    }))
})

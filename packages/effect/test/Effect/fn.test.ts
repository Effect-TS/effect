import { Cause, Effect } from "effect"
import { assertTrue, strictEqual } from "effect/test/util"
import { describe, it } from "effect/test/utils/extend"

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
      assertTrue(cause.defect instanceof Error && cause.defect.message === "test")
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
      assertTrue(cause.defect instanceof Error && cause.defect.message === "test")
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
      assertTrue(cause.left.defect instanceof Error && cause.left.defect.message === "test")
      assertTrue(cause.right.defect instanceof Error && cause.right.defect.message === "test2")
    }))
})

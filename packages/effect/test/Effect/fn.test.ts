import { describe, it } from "@effect/vitest"
import { assertEquals, assertInstanceOf, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, Chunk, Effect, Stream } from "effect"

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

  it("should preserve the function length", () => {
    const f = function*(n: number) {
      return n
    }
    const fn1 = Effect.fn("fn1")(f)
    strictEqual(fn1.length, 1)
    strictEqual(Effect.runSync(fn1(2)), 2)
    const fn2 = Effect.fn(f)
    strictEqual(fn2.length, 1)
    strictEqual(Effect.runSync(fn2(2)), 2)
  })
})

describe("Effect.fnUntraced", () => {
  it("should preserve the function length", () => {
    const f = function*(n: number) {
      return n
    }
    const fn1 = Effect.fnUntraced(f)
    strictEqual(fn1.length, 1)
    strictEqual(Effect.runSync(fn1(2)), 2)
    const fn2 = Effect.fnUntraced(f, (x) => x)
    strictEqual(fn2.length, 1)
    strictEqual(Effect.runSync(fn2(2)), 2)
  })

  it.effect("can access args in single pipe", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntraced(
        function*(n: number) {
          return n
        },
        (effect, n) => Effect.map(effect, (a) => a + n),
        (effect, n) => Effect.map(effect, (a) => a + n)
      )
      const n = yield* fn(1)
      assertEquals(n, 3)
    }))

  it.effect("can return non-effects", () =>
    Effect.gen(function*() {
      const fn = Effect.fnUntraced(
        function*(n: number) {
          return n
        },
        (effect, n) => Effect.map(effect, (a) => a + n),
        Stream.fromEffect
      )
      const n = yield* Stream.runCollect(fn(1))
      deepStrictEqual(Chunk.toReadonlyArray(n), [2])
    }))
})

import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import { assertLeft, assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"
import * as it from "effect/test/utils/extend"
import { describe } from "vitest"

const sum = (n: number): number => {
  if (n < 0) {
    return 0
  }
  return n + sum(n - 1)
}

describe("Effect", () => {
  it.it("runSyncExit with async is a defect with stack", () => {
    const exit = Effect.runSyncExit(
      Effect.promise(() => Promise.resolve(0)).pipe(Effect.withSpan("asyncSpan"))
    )
    if (Exit.isFailure(exit)) {
      it.expect(Cause.pretty(exit.cause)).toContain("asyncSpan")
    } else {
      it.expect(exit._tag).toBe("Failure")
    }
  })
  it.effect("sync - effect", () =>
    Effect.gen(function*($) {
      const sumEffect = (n: number): Effect.Effect<number, unknown> => {
        if (n < 0) {
          return Effect.sync(() => 0)
        }
        return pipe(Effect.sync(() => n), Effect.flatMap((b) => pipe(sumEffect(n - 1), Effect.map((a) => a + b))))
      }
      const result = yield* $(sumEffect(1000))
      strictEqual(result, sum(1000))
    }))
  it.it("sync - must be lazy", async () => {
    let program
    try {
      program = Effect.sync(() => {
        throw new Error("shouldn't happen!")
      })
      program = Effect.succeed(true)
    } catch {
      program = Effect.succeed(false)
    }
    const result = await Effect.runPromise(program)
    assertTrue(result)
  })
  it.it("suspend - must be lazy", async () => {
    let program
    try {
      program = Effect.suspend(() => {
        throw new Error("shouldn't happen!")
      })
      program = Effect.succeed(true)
    } catch {
      program = Effect.succeed(false)
    }
    const result = await Effect.runPromise(program)
    assertTrue(result)
  })
  it.effect("suspend - must catch throwable", () =>
    Effect.gen(function*($) {
      const error = new Error("woops")
      const result = yield* $(
        Effect.suspend<never, never, never>(() => {
          throw error
        }),
        Effect.exit
      )
      deepStrictEqual(result, Exit.die(error))
    }))
  it.effect("suspendSucceed - must be evaluatable", () =>
    Effect.gen(function*($) {
      const result = yield* $(Effect.suspend(() => Effect.succeed(42)))
      strictEqual(result, 42)
    }))
  it.effect("suspendSucceed - must not catch throwable", () =>
    Effect.gen(function*($) {
      const error = new Error("woops")
      const result = yield* $(
        Effect.suspend<never, never, never>(() => {
          throw error
        }),
        Effect.sandbox,
        Effect.either
      )
      assertLeft(result, Cause.die(error))
    }))
})

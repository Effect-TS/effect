import { describe, expect, it } from "@effect/vitest"
import { Cause, Duration, Effect, Exit, Scope } from "effect"
import { TestClock } from "effect/testing"

describe("Scope", () => {
  describe("parallel finalization", () => {
    it.effect("executes finalizers in parallel", () =>
      Effect.gen(function*() {
        const scope = Scope.makeUnsafe("parallel")
        yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
        yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
        yield* Scope.addFinalizer(scope, Effect.sleep(Duration.seconds(1)))
        const fiber = yield* Effect.forkChild(Scope.close(scope, Exit.void), { startImmediately: true })
        expect(fiber.pollUnsafe()).toBeUndefined()
        yield* TestClock.adjust(Duration.seconds(1))
        expect(fiber.pollUnsafe()).toBeDefined()
      }))
  })

  describe("finalizers that throw", () => {
    const reasons = (exit: Exit.Exit<unknown, unknown>) =>
      Exit.isSuccess(exit) ? [] : exit.cause.reasons.map((reason) =>
        Cause.isFailReason(reason)
          ? `fail:${String(reason.error)}`
          : Cause.isDieReason(reason)
          ? `die:${String(reason.defect)}`
          : "interrupt"
      )
    for (const strategy of ["sequential", "parallel"] as const) {
      it.effect(`${strategy}: continues and awaits remaining finalizers after a throw`, () =>
        Effect.gen(function*() {
          const scope = Scope.makeUnsafe(strategy)
          const log: Array<string> = []
          yield* Scope.addFinalizer(
            scope,
            Effect.gen(function*() {
              yield* Effect.yieldNow
              log.push("remaining")
            })
          )
          yield* Scope.addFinalizerExit(scope, () => {
            log.push("throwing")
            throw "release"
          })
          const exit = yield* Effect.exit(Scope.close(scope, Exit.void))
          expect(log).toEqual(["throwing", "remaining"])
          expect(reasons(exit)).toEqual(["die:release"])
        }))
    }

    it.effect("a sole throwing finalizer keeps the scoped effect's failure", () =>
      Effect.gen(function*() {
        const exit = yield* Effect.gen(function*() {
          const scope = yield* Effect.scope
          yield* Scope.addFinalizerExit(scope, () => {
            throw "release"
          })
          return yield* Effect.fail("error")
        }).pipe(Effect.scoped, Effect.exit)
        expect(reasons(exit)).toEqual(["fail:error", "die:release"])
      }))
  })
})

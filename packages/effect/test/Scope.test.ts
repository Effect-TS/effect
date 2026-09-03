import { describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Exit, Scope } from "effect"
import { TestClock } from "effect/testing"

describe("Scope", () => {
  for (const strategy of ["sequential", "parallel"] as const) {
    it.effect(`runs remaining ${strategy} finalizers when a finalizer callback throws`, () =>
      Effect.gen(function*() {
        const scope = yield* Scope.make(strategy)
        const finalized: Array<string> = []
        const defect = new Error("boom")
        yield* Scope.addFinalizer(scope, Effect.sync(() => finalized.push("remaining")))
        yield* Scope.addFinalizerExit(scope, () => {
          finalized.push("throwing")
          throw defect
        })

        const closeExit = yield* Effect.exit(Scope.close(scope, Exit.void))

        expect(closeExit).toEqual(Exit.die(defect))
        expect([...finalized].sort()).toEqual(["remaining", "throwing"])
      }))
  }

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
})

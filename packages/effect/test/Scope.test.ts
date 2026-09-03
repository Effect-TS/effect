import { describe, expect, it } from "@effect/vitest"
import { Duration, Effect, Exit, Scope } from "effect"
import { TestClock } from "effect/testing"

describe("Scope", () => {
  describe("finalizer defects", () => {
    for (const strategy of ["sequential", "parallel"] as const) {
      it.effect(`runs remaining ${strategy} finalizers when a finalizer callback throws`, () =>
        Effect.gen(function*() {
          const scope = yield* Scope.make(strategy)
          const finalized: Array<string> = []
          const defect = new Error("boom")
          yield* Scope.addFinalizer(scope, Effect.sync(() => finalized.push("remaining-1")))
          yield* Scope.addFinalizerExit(scope, () => {
            finalized.push("throwing")
            throw defect
          })
          yield* Scope.addFinalizer(scope, Effect.sync(() => finalized.push("remaining-2")))

          const closeExit = yield* Effect.exit(Scope.close(scope, Exit.void))

          expect(closeExit).toEqual(Exit.die(defect))
          if (strategy === "sequential") {
            expect(finalized).toEqual(["remaining-2", "throwing", "remaining-1"])
          } else {
            expect(finalized.sort()).toEqual(["remaining-1", "remaining-2", "throwing"])
          }
        }))
    }
  })

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

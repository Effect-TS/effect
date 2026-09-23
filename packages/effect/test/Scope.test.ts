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
    const throwing = (name: string) => () => {
      throw name
    }
    const dying = (name: string) => () => Effect.die(name)

    for (const strategy of ["sequential", "parallel"] as const) {
      it.effect(`${strategy}: a throw closes like Effect.die`, () =>
        Effect.gen(function*() {
          const close = (bad: (name: string) => () => Effect.Effect<void>) =>
            Effect.gen(function*() {
              const log: Array<string> = []
              const scope = Scope.makeUnsafe(strategy)
              for (let i = 0; i < 2; i++) {
                const name = `f${i}`
                yield* Scope.addFinalizerExit(scope, () => {
                  log.push(name)
                  return i === 1 ? bad(name)() : Effect.void
                })
              }
              const exit = yield* Effect.exit(Scope.close(scope, Exit.void))
              return { log, reasons: reasons(exit) }
            })
          expect(yield* close(throwing)).toEqual(yield* close(dying))
        }))
    }

    it.effect("a throwing finalizer keeps the scoped effect's failure", () =>
      Effect.gen(function*() {
        for (const closeChild of [false, true]) {
          const scoped = (bad: (name: string) => () => Effect.Effect<void>) =>
            Effect.gen(function*() {
              const scope = yield* Effect.scope
              const child = closeChild ? yield* Scope.fork(scope) : undefined
              yield* Scope.addFinalizerExit(scope, bad("release"))
              if (child !== undefined) yield* Scope.close(child, Exit.void)
              return yield* Effect.fail("error")
            }).pipe(Effect.scoped, Effect.exit, Effect.map(reasons))
          const label = closeChild ? "after a child scope closed" : "only finalizer"
          expect(yield* scoped(throwing), label).toEqual(["fail:error", "die:release"])
          expect(yield* scoped(throwing), label).toEqual(yield* scoped(dying))
        }
      }))
  })
})

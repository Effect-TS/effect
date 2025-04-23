import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import { Effect, Exit, RcRef, Scope, TestClock } from "effect"

describe("RcRef", () => {
  it.effect("deallocation", () =>
    Effect.gen(function*() {
      let acquired = 0
      let released = 0
      const refScope = yield* Scope.make()
      const ref = yield* RcRef.make({
        acquire: Effect.acquireRelease(
          Effect.sync(() => {
            acquired++
            return "foo"
          }),
          () =>
            Effect.sync(() => {
              released++
            })
        )
      }).pipe(
        Scope.extend(refScope)
      )

      strictEqual(acquired, 0)
      strictEqual(yield* Effect.scoped(ref), "foo")
      strictEqual(acquired, 1)
      strictEqual(released, 1)

      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      yield* ref.pipe(Scope.extend(scopeA))
      yield* ref.pipe(Scope.extend(scopeB))
      strictEqual(acquired, 2)
      strictEqual(released, 1)
      yield* Scope.close(scopeB, Exit.void)
      strictEqual(acquired, 2)
      strictEqual(released, 1)
      yield* Scope.close(scopeA, Exit.void)
      strictEqual(acquired, 2)
      strictEqual(released, 2)

      const scopeC = yield* Scope.make()
      yield* ref.pipe(Scope.extend(scopeC))
      strictEqual(acquired, 3)
      strictEqual(released, 2)

      yield* Scope.close(refScope, Exit.void)
      strictEqual(acquired, 3)
      strictEqual(released, 3)

      const exit = yield* ref.get.pipe(Effect.scoped, Effect.exit)
      assertTrue(Exit.isInterrupted(exit))
    }))

  it.scoped("idleTimeToLive", () =>
    Effect.gen(function*() {
      let acquired = 0
      let released = 0
      const ref = yield* RcRef.make({
        acquire: Effect.acquireRelease(
          Effect.sync(() => {
            acquired++
            return "foo"
          }),
          () =>
            Effect.sync(() => {
              released++
            })
        ),
        idleTimeToLive: 1000
      })

      strictEqual(acquired, 0)
      strictEqual(yield* Effect.scoped(RcRef.get(ref)), "foo")
      strictEqual(acquired, 1)
      strictEqual(released, 0)

      yield* TestClock.adjust(1000)
      strictEqual(released, 1)

      strictEqual(yield* Effect.scoped(RcRef.get(ref)), "foo")
      strictEqual(acquired, 2)
      strictEqual(released, 1)

      yield* TestClock.adjust(500)
      strictEqual(yield* Effect.scoped(RcRef.get(ref)), "foo")
      strictEqual(acquired, 2)
      strictEqual(released, 1)

      yield* TestClock.adjust(1000)
      strictEqual(released, 2)
    }))
})

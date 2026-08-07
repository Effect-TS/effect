import { assert, describe, it } from "@effect/vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as RcRef from "effect/RcRef"
import * as Ref from "effect/Ref"
import * as Scope from "effect/Scope"

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
        Scope.provide(refScope)
      )

      assert.strictEqual(acquired, 0)
      assert.strictEqual(yield* Effect.scoped(RcRef.get(ref)), "foo")
      assert.strictEqual(acquired, 1)
      assert.strictEqual(released, 1)

      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      yield* RcRef.get(ref).pipe(Scope.provide(scopeA))
      yield* RcRef.get(ref).pipe(Scope.provide(scopeB))
      assert.strictEqual(acquired, 2)
      assert.strictEqual(released, 1)
      yield* Scope.close(scopeB, Exit.void)
      assert.strictEqual(acquired, 2)
      assert.strictEqual(released, 1)
      yield* Scope.close(scopeA, Exit.void)
      assert.strictEqual(acquired, 2)
      assert.strictEqual(released, 2)

      const scopeC = yield* Scope.make()
      yield* RcRef.get(ref).pipe(Scope.provide(scopeC))
      assert.strictEqual(acquired, 3)
      assert.strictEqual(released, 2)

      yield* Scope.close(refScope, Exit.void)
      assert.strictEqual(acquired, 3)
      assert.strictEqual(released, 3)

      const exit = yield* RcRef.get(ref).pipe(Effect.scoped, Effect.exit)
      assert.isTrue(Exit.hasInterrupts(exit))
    }))

  it.effect("shares one generation between concurrent first borrowers", () =>
    Effect.gen(function*() {
      const acquired = yield* Ref.make(0)
      const released = yield* Ref.make(0)
      const firstStarted = yield* Deferred.make<void>()
      const releaseFirst = yield* Deferred.make<void>()
      const refScope = yield* Scope.make()
      const scopeA = yield* Scope.make()
      const scopeB = yield* Scope.make()
      const ref = yield* RcRef.make({
        acquire: Effect.acquireRelease(
          Effect.gen(function*() {
            const id = yield* Ref.updateAndGet(acquired, (n) => n + 1)
            if (id === 1) {
              yield* Deferred.succeed(firstStarted, undefined)
              yield* Deferred.await(releaseFirst)
            }
            return { id }
          }),
          () => Ref.update(released, (n) => n + 1)
        )
      }).pipe(Scope.provide(refScope))

      const fiberA = yield* RcRef.get(ref).pipe(
        Scope.provide(scopeA),
        Effect.forkChild({ startImmediately: true })
      )
      yield* Deferred.await(firstStarted)
      const fiberB = yield* RcRef.get(ref).pipe(
        Scope.provide(scopeB),
        Effect.forkChild({ startImmediately: true })
      )
      yield* Deferred.succeed(releaseFirst, undefined)

      const exitA = yield* Fiber.await(fiberA)
      const exitB = yield* Fiber.await(fiberB)
      const generationA = yield* Fiber.join(fiberA)
      const generationB = yield* Fiber.join(fiberB)
      const closeAExit = yield* Scope.close(scopeA, Exit.void).pipe(Effect.exit)
      const closeBExit = yield* Scope.close(scopeB, Exit.void).pipe(Effect.exit)
      const refCloseExit = yield* Scope.close(refScope, Exit.void).pipe(Effect.exit)

      assert.deepStrictEqual(
        {
          exitA,
          exitB,
          closeAExit,
          closeBExit,
          refCloseExit,
          sameGeneration: generationA === generationB,
          acquired: yield* Ref.get(acquired),
          released: yield* Ref.get(released)
        },
        {
          exitA: Exit.succeed(generationA),
          exitB: Exit.succeed(generationA),
          closeAExit: Exit.void,
          closeBExit: Exit.void,
          refCloseExit: Exit.void,
          sameGeneration: true,
          acquired: 1,
          released: 1
        }
      )
    }))
})

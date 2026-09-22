import { assert, describe, it } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import * as HashSet from "effect/HashSet"
import * as Scope from "effect/Scope"

const interruptBefore = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.gen(function*() {
    const ready = yield* Deferred.make<void>()
    const resume = yield* Deferred.make<void>()
    const fiber = yield* Effect.gen(function*() {
      yield* Deferred.succeed(ready, undefined)
      yield* Deferred.await(resume)
      yield* effect
    }).pipe(Effect.uninterruptible, Effect.fork)
    yield* Deferred.await(ready)
    yield* Fiber.interruptAsFork(fiber, yield* Effect.fiberId)
    yield* Deferred.succeed(resume, undefined)
    return yield* Fiber.await(fiber)
  })

describe("Effect.addFinalizer", () => {
  it.effect("does not import a masked acquirer's interruption into scope closure", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      let finalized = 0
      const acquired = yield* interruptBefore(
        Effect.addFinalizer(() => Effect.sync(() => finalized++)).pipe(Scope.extend(scope))
      )
      assert.isTrue(Exit.isInterrupted(acquired))
      assert.strictEqual(finalized, 0)
      assert.isTrue(Cause.isEmpty(yield* FiberRef.get(FiberRef.interruptedCause)))
      const closed = yield* Effect.exit(Scope.close(scope, Exit.void))
      assert.isTrue(Cause.isEmpty(yield* FiberRef.get(FiberRef.interruptedCause)))
      assert.deepStrictEqual(closed, Exit.void)
      assert.strictEqual(finalized, 1)
    }))

  it.effect("preserves genuine interruption of the closing fiber", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      let finalized = 0
      yield* Effect.addFinalizer(() => Effect.sync(() => finalized++)).pipe(Scope.extend(scope))
      const interruptor = yield* Effect.fiberId
      const closed = yield* interruptBefore(Scope.close(scope, Exit.void))
      assert.strictEqual(finalized, 1)
      assert.isTrue(Exit.isFailure(closed))
      if (Exit.isFailure(closed)) {
        assert.isTrue(Cause.isInterruptedOnly(closed.cause))
        const interruptors = Cause.interruptors(closed.cause)
        assert.strictEqual(HashSet.size(interruptors), 1)
        assert.isTrue(HashSet.has(interruptors, interruptor))
      }
    }))

  it.effect("replays the acquirer's other FiberRefs and restores the closer's values", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      const ref = FiberRef.unsafeMake("initial")
      let observed: string | undefined
      yield* Effect.gen(function*() {
        yield* FiberRef.set(ref, "acquirer")
        yield* Effect.addFinalizer(() =>
          Effect.gen(function*() {
            observed = yield* FiberRef.get(ref)
            yield* FiberRef.set(ref, "finalizer")
          })
        )
      }).pipe(Scope.extend(scope), Effect.fork, Effect.flatMap(Fiber.join))
      yield* FiberRef.set(ref, "closer")
      yield* Scope.close(scope, Exit.void)
      assert.strictEqual(observed, "acquirer")
      assert.strictEqual(yield* FiberRef.get(ref), "closer")
    }))

  it.effect("acquireRelease does not import interruption from masked acquisition", () =>
    Effect.gen(function*() {
      const scope = yield* Scope.make()
      let released: string | undefined
      const ready = yield* Deferred.make<void>()
      const resume = yield* Deferred.make<void>()
      const acquirer = yield* Effect.acquireRelease(
        Effect.gen(function*() {
          yield* Deferred.succeed(ready, undefined)
          yield* Deferred.await(resume)
          return "resource"
        }),
        (resource) =>
          Effect.sync(() => {
            released = resource
          })
      ).pipe(Scope.extend(scope), Effect.fork)
      yield* Deferred.await(ready)
      yield* Fiber.interruptFork(acquirer)
      yield* Deferred.succeed(resume, undefined)
      assert.isTrue(Exit.isInterrupted(yield* Fiber.await(acquirer)))
      assert.isUndefined(released)
      assert.isTrue(Cause.isEmpty(yield* FiberRef.get(FiberRef.interruptedCause)))
      const closed = yield* Effect.exit(Scope.close(scope, Exit.void))
      assert.isTrue(Cause.isEmpty(yield* FiberRef.get(FiberRef.interruptedCause)))
      assert.deepStrictEqual(closed, Exit.void)
      assert.strictEqual(released, "resource")
    }))
})

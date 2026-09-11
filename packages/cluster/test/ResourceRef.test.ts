import { assert, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, Option, Scope, TestServices } from "effect"
import { ResourceRef } from "../src/internal/resourceRef.js"

it.effect("does not wedge await after a failed rebuild", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    let fail = false
    let releases = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Scope.addFinalizer(
        scope,
        Effect.sync(() => releases++)
      ).pipe(
        Effect.andThen(fail ? Effect.fail("failed") : Effect.succeed(1))
      ))
    fail = true
    assert.deepStrictEqual(yield* Effect.exit(ref.unsafeRebuild()), Exit.fail("failed"))
    const completed = yield* Effect.exit(ref.await).pipe(Effect.timeoutOption(100), TestServices.provideLive)
    assert(Option.isSome(completed), "waiter stayed blocked after acquisition failed")
    assert(Exit.isFailure(completed.value))
    assert.strictEqual(Cause.squash(completed.value.cause), "failed")
    assert.strictEqual(releases, 2)
    fail = false
    yield* ref.unsafeRebuild()
    assert.strictEqual(yield* ref.await, 1)
  })))

it.effect("does not let a stale rebuild overwrite a newer acquisition", () =>
  Effect.scoped(Effect.gen(function*() {
    const parentScope = yield* Effect.scope
    const releasing = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const newerAcquiring = yield* Deferred.make<void>()
    const newerAcquire = yield* Deferred.make<void>()
    let acquisitions = 0
    const ref = yield* ResourceRef.from(parentScope, (scope) =>
      Effect.gen(function*() {
        const acquisition = ++acquisitions
        if (acquisition === 1) {
          yield* Scope.addFinalizer(
            scope,
            Deferred.succeed(releasing, void 0).pipe(Effect.andThen(Deferred.await(release)))
          )
        } else if (acquisition === 2) {
          yield* Deferred.succeed(newerAcquiring, void 0)
          yield* Deferred.await(newerAcquire)
        } else {
          return yield* Effect.fail("stale")
        }
        return acquisition
      }))

    const staleRebuild = yield* Effect.fork(ref.unsafeRebuild())
    yield* Deferred.await(releasing)
    const newerRebuild = yield* Effect.fork(ref.unsafeRebuild())
    yield* Deferred.await(newerAcquiring)

    yield* Deferred.succeed(release, void 0)
    assert.deepStrictEqual(yield* Fiber.await(staleRebuild), Exit.fail("stale"))
    assert.strictEqual(ref.state.current._tag, "Acquiring")
    const waiter = yield* Effect.fork(ref.await)
    yield* Effect.yieldNow()
    assert.isNull(waiter.unsafePoll())

    yield* Deferred.succeed(newerAcquire, void 0)
    yield* Fiber.join(newerRebuild)
    assert.strictEqual(yield* ref.await, 2)
  })))

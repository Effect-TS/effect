import { assert } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Scope } from "effect"

/**
 * Checks that a fork into a scope registers the fiber in the same step that
 * starts it. The forked work interrupts its forker while starting, so the fiber
 * must outlive the forker, and closing the scope must still interrupt it and
 * wait for its finalizer.
 *
 * `fork` must start `work` immediately and tie it to `scope`.
 */
export const assertRegistersDuringStartup = <R>(
  fork: (work: Effect.Effect<never>, scope: Scope.Scope) => Effect.Effect<unknown, never, R>
): Effect.Effect<void, never, R> =>
  Effect.gen(function*() {
    const scope = yield* Scope.make()
    const started = yield* Deferred.make<Fiber.Fiber<unknown, unknown>>()
    const cleaning = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const forker = yield* Effect.withFiber((parent) => {
      const work = Effect.withFiber((child) => Deferred.succeed(started, child)).pipe(
        Effect.andThen(Effect.sync(() => parent.interruptUnsafe())),
        Effect.andThen(Effect.never),
        Effect.ensuring(Deferred.succeed(cleaning, undefined).pipe(Effect.andThen(Deferred.await(release))))
      )
      return fork(work, scope)
    }).pipe(Effect.forkChild)
    const child = yield* Deferred.await(started)
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(forker)))
    assert.isUndefined(child.pollUnsafe())
    const closing = yield* Effect.forkChild(Scope.close(scope, Exit.void))
    yield* Deferred.await(cleaning)
    yield* Effect.yieldNow
    assert.isUndefined(closing.pollUnsafe())
    yield* Deferred.succeed(release, undefined)
    yield* Fiber.join(closing)
    assert.isTrue(Exit.hasInterrupts(yield* Fiber.await(child)))
  })

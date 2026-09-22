import * as Effect from "../Effect.ts"
import type * as Scope from "../Scope.ts"

/**
 * Acquiring a transactional resource and installing its release are one step.
 * The acquiring transaction never retries: it takes the resource or reports
 * that it could not, and the release is installed in the same uninterruptible
 * step that took it. Waiting happens in a separate transaction that only
 * reads, so a waiter can be interrupted, timed out or raced while it parks.
 *
 * `tryAcquire` returns `undefined` when the resource is not available;
 * `awaitAvailable` retries until it looks available.
 *
 * @internal
 */
export const txAcquireUseRelease = <A, B, E, R>(
  tryAcquire: Effect.Effect<A | undefined>,
  awaitAvailable: Effect.Effect<void>,
  use: (acquired: A) => Effect.Effect<B, E, R>,
  release: (acquired: A) => Effect.Effect<unknown>
): Effect.Effect<B, E, R> =>
  Effect.uninterruptibleMask((restore) => {
    const loop: Effect.Effect<B, E, R> = Effect.flatMap(tryAcquire, (acquired) =>
      acquired === undefined
        ? Effect.flatMap(restore(awaitAvailable), () => loop)
        : Effect.onExit(restore(use(acquired)), () => release(acquired)))
    return loop
  })

/**
 * The scoped form of {@link txAcquireUseRelease}: the release is added to the
 * current scope in the same step that acquired the resource.
 *
 * @internal
 */
export const txAcquireScoped = <A>(
  tryAcquire: Effect.Effect<A | undefined>,
  awaitAvailable: Effect.Effect<void>,
  release: (acquired: A) => Effect.Effect<unknown>
): Effect.Effect<A, never, Scope.Scope> =>
  Effect.uninterruptibleMask((restore) => {
    const loop: Effect.Effect<A, never, Scope.Scope> = Effect.flatMap(tryAcquire, (acquired) =>
      acquired === undefined
        ? Effect.flatMap(restore(awaitAvailable), () => loop)
        : Effect.as(Effect.addFinalizer(() => Effect.asVoid(release(acquired))), acquired))
    return loop
  })

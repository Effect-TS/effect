/**
 * When this effect represents acquisition of a resource (for example, opening
 * a file, launching a thread, etc.), `acquireReleaseWith` can be used to
 * ensure the acquisition is not interrupted and the resource is always
 * released.
 *
 * The function does two things:
 *
 *   1. Ensures this effect, which acquires the resource, will not be
 *      interrupted. Of course, acquisition may fail for internal reasons (an
 *      uncaught exception).
 *   2. Ensures the `release` effect will not be interrupted, and will be
 *      executed so long as this effect successfully
 *      acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even if the
 * `use` effect succeeds. If this fail-fast behavior is not desired, errors
 * produced by the `release` effect can be caught and ignored.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireUseRelease
 * @tsplus fluent effect/core/io/Effect acquireUseRelease
 */
export function acquireUseRelease<R, E, A, R2, E2, A2, R3, X>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A) => Effect<R3, never, X>
): Effect<R | R2 | R3, E | E2, A2> {
  return Effect.acquireUseReleaseExit(acquire, use, (a, _) => release(a))
}

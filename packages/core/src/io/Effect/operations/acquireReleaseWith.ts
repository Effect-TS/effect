import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

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
 * @tsplus static ets/EffectOps acquireReleaseWith
 */
export function acquireReleaseWith<R, E, A, R1, E1, A1, R2, E2, A2>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.acquireReleaseExitWith(acquire, use, (a, _) => release(a))
}

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
 * @tsplus fluent ets/Effect acquireReleaseWith
 */
export function acquireReleaseWithNow_<R, E, A, R1, E1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.acquireReleaseWith(self, use, release)
}

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
 * @ets_data_first acquireReleaseWithNow_
 */
export function acquireReleaseWithNow<A, E1, R1, A1, R2, E2, A2>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A) => Effect<R2, E2, A2>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    self.acquireReleaseWith(use, release)
}

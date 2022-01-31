// ets_tracing: off

import { bracketExit_ } from "./bracketExit.js"
import type { Effect } from "./effect.js"

/**
 * When this effect represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this effect, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` effect will not be interrupted, and will be
 * executed so long as this effect successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even
 * if the `use` effect succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` effect can be caught and ignored.
 *
 * @ets_data_first bracket_
 */
export function bracket<A, E1, R1, A1, R2, E2, A2>(
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A) => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    bracket_(acquire, use, release, __trace)
}

/**
 * When this effect represents acquisition of a resource (for example,
 * opening a file, launching a thread, etc.), `bracket` can be used to ensure
 * the acquisition is not interrupted and the resource is always released.
 *
 * The function does two things:
 *
 * 1. Ensures this effect, which acquires the resource, will not be
 * interrupted. Of course, acquisition may fail for internal reasons (an
 * uncaught exception).
 * 2. Ensures the `release` effect will not be interrupted, and will be
 * executed so long as this effect successfully acquires the resource.
 *
 * In between acquisition and release of the resource, the `use` effect is
 * executed.
 *
 * If the `release` effect fails, then the entire effect will fail even
 * if the `use` effect succeeds. If this fail-fast behavior is not desired,
 * errors produced by the `release` effect can be caught and ignored.
 */
export function bracket_<R, E, A, E1, R1, A1, R2, E2, A2>(
  acquire: Effect<R, E, A>,
  use: (a: A) => Effect<R1, E1, A1>,
  release: (a: A) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return bracketExit_(acquire, use, release, __trace)
}

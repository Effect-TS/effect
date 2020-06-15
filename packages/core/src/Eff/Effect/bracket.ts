import { bracketExit } from "./bracketExit"
import { Effect } from "./effect"

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
export const bracket = <S, R, E, A, S1, E1, R1, A1, S2, R2, E2, A2>(
  acquire: Effect<S, R, E, A>,
  release: (a: A) => Effect<S2, R2, E2, A2>,
  use: (a: A) => Effect<S1, R1, E1, A1>
): Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, A1> =>
  bracketExit(acquire, release, use)

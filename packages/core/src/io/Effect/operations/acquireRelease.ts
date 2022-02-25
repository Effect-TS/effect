import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * A less powerful variant of `acquireReleaseWith` where the resource acquired
 * by this effect is not needed.
 *
 * @tsplus static ets/EffectOps acquireRelease
 */
export function acquireRelease<R, E, A, E1, R1, A1, R2, E2, A2>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: LazyArg<Effect<R1, E1, A1>>,
  release: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return Effect.acquireReleaseWith(acquire, use, release)
}

/**
 * A less powerful variant of `acquireReleaseWith` where the resource acquired
 * by this effect is not needed.
 *
 * @tsplus fluent ets/Effect acquireRelease
 */
export function acquireReleaseNow_<R, E, A, E1, R1, A1, R2, E2, A2>(
  self: Effect<R, E, A>,
  use: LazyArg<Effect<R1, E1, A1>>,
  release: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return acquireRelease(self, use, release)
}

/**
 * A less powerful variant of `acquireReleaseWith` where the resource acquired
 * by this effect is not needed.
 *
 * @ets_data_first acquireReleaseNow_
 */
export function acquireReleaseNow<E1, R1, A1, R2, E2, A2>(
  use: LazyArg<Effect<R1, E1, A1>>,
  release: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    self.acquireRelease(use, release)
}

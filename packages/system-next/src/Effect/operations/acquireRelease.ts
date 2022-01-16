// ets_tracing: off

import type { Effect } from "../definition"
import { acquireReleaseWith_ } from "./acquireReleaseWith"

/**
 * A less powerful variant of `acquireReleaseWith` where the resource acquired
 * by this effect is not needed.
 */
export function acquireRelease_<R, E, A, E1, R1, A1, R2, E2, A2>(
  acquire: Effect<R, E, A>,
  use: Effect<R1, E1, A1>,
  release: Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R1 & R2, E | E1 | E2, A1> {
  return acquireReleaseWith_(
    acquire,
    () => use,
    () => release,
    __trace
  )
}

/**
 * A less powerful variant of `acquireReleaseWith` where the resource acquired
 * by this effect is not needed.
 *
 * @ets_data_first acquireRelease_
 */
export function acquireRelease<E1, R1, A1, R2, E2, A2>(
  use: Effect<R1, E1, A1>,
  release: Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, E, A>(acquire: Effect<R, E, A>): Effect<R & R1 & R2, E | E1 | E2, A1> =>
    acquireRelease_(acquire, use, release, __trace)
}

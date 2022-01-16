// ets_tracing: off

import type { Effect } from "../../Effect/definition/base"
import type { Managed } from "../definition"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action. The
 * acquire and release actions will be performed uninterruptibly.
 */
export function acquireReleaseWith_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: (a: A) => Effect<R1, never, any>,
  __trace?: string
): Managed<R & R1, E, A> {
  return acquireReleaseExitWith_(acquire, (a) => release(a), __trace)
}

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action. The
 * acquire and release actions will be performed uninterruptibly.
 *
 * @ets_data_first acquireReleaseWith_
 */
export function acquireReleaseWith<A, R1>(
  release: (a: A) => Effect<R1, never, any>,
  __trace?: string
) {
  return <R, E>(acquire: Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireReleaseWith_(acquire, release, __trace)
}

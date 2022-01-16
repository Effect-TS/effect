// ets_tracing: off

import type { Managed } from "../definition"
import type * as T from "./_internal/effect"
import { acquireReleaseExitWith_ } from "./acquireReleaseExitWith"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not need access to the resource. The acquire and release actions will
 * be performed uninterruptibly.
 */
export function acquireRelease_<R, R1, E, A>(
  acquire: T.Effect<R, E, A>,
  release: T.Effect<R1, never, any>,
  __trace?: string
): Managed<R & R1, E, A> {
  return acquireReleaseExitWith_(acquire, () => release, __trace)
}

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not need access to the resource. The acquire and release actions will
 * be performed uninterruptibly.
 *
 * @ets_data_first acquireRelease_
 */
export function acquireRelease<R1>(
  release: T.Effect<R1, never, any>,
  __trace?: string
) {
  return <R, E, A>(acquire: T.Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireRelease_(acquire, release, __trace)
}

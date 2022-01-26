import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not need access to the resource. The acquire and release actions will
 * be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireRelease
 */
export function acquireRelease_<R, R1, E, A>(
  acquire: Effect<R, E, A>,
  release: Effect<R1, never, any>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed.acquireReleaseExitWith(acquire, () => release)
}

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not need access to the resource. The acquire and release actions will
 * be performed uninterruptibly.
 *
 * @ets_data_first acquireRelease_
 */
export function acquireRelease<R1>(
  release: Effect<R1, never, any>,
  __etsTrace?: string
) {
  return <R, E, A>(acquire: Effect<R, E, A>): Managed<R & R1, E, A> =>
    acquireRelease_(acquire, release)
}

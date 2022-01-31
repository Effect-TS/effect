import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not need access to the resource. The acquire and release actions will
 * be performed uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireRelease
 */
export function acquireRelease<R, R1, E, A, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: LazyArg<Effect<R1, never, X>>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed.acquireReleaseExitWith(acquire, release)
}

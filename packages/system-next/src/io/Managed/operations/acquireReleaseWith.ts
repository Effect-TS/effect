import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect/definition/base"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action. The
 * acquire and release actions will be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseWith
 */
export function acquireReleaseWith<R, R1, E, A>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A) => Effect<R1, never, any>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed.acquireReleaseExitWith(acquire, (a) => release(a))
}

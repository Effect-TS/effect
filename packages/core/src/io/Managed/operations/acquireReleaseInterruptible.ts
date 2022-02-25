import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action
 * that does not require access to the resource. The acquire action will be
 * performed interruptibly, while release will be performed uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireReleaseInterruptible
 */
export function acquireReleaseInterruptible<R, R1, E, A>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: LazyArg<Effect<R1, never, any>>,
  __tsplusTrace?: string
): Managed<R & R1, E, A> {
  return Managed.acquireReleaseInterruptibleWith(acquire, () => release())
}

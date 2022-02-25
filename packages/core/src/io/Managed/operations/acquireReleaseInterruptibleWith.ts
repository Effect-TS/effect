import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into a `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release will be
 * performed uninterruptibly.
 *
 * @tsplus static ets/ManagedOps acquireReleaseInterruptibleWith
 */
export function acquireReleaseInterruptibleWith<R, R1, E, A>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A) => Effect<R1, never, any>,
  __tsplusTrace?: string
): Managed<R & R1, E, A> {
  return Managed.fromEffect(acquire).onExitFirst((_) => _.forEach(release))
}

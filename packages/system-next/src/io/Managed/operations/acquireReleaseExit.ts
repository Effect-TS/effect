import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../Effect"
import type { Exit } from "../../Exit/definition"
import { Managed } from "../definition"

/**
 * Lifts an `Effect<R, E, A>` into `Managed<R, E, A>` with a release action that
 * does not need access to the resource but handles `Exit`. The acquire and
 * release actions will be performed uninterruptibly.
 *
 * @ets static ets/ManagedOps acquireReleaseExit
 */
export function acquireReleaseExit<R, R1, E, A>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (exit: Exit<any, any>) => Effect<R1, never, any>,
  __etsTrace?: string
): Managed<R & R1, E, A> {
  return Managed.acquireReleaseExitWith(acquire, (_, exit) => release(exit))
}

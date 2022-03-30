import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../Exit"
import type { HasScope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A more powerful variant of `acquireRelease` that allows the `release`
 * workflow to depend on the `Exit` value specified when the scope is closed.
 *
 * @tsplus static ets/EffectOps acquireReleaseExit
 */
export function acquireReleaseExit<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A, exit: Exit<unknown, unknown>) => RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R & R2 & HasScope, E, A> {
  return Effect.suspendSucceed(acquire)
    .tap((a) => Effect.addFinalizerExit((exit) => release(a, exit)))
    .uninterruptible()
}

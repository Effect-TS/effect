import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../Exit"
import type { HasScope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A more powerful variant of `acquireReleaseInterruptible` that allows the
 * `release` effect to depend on the `Exit` value specified when the scope
 * is closed.
 *
 * @tsplus static ets/EffectOps acquireReleaseInterruptibleExit
 */
export function acquireReleaseInterruptibleExit<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (exit: Exit<unknown, unknown>) => RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R & R2 & HasScope, E, A> {
  return Effect.suspendSucceed(acquire().ensuring(Effect.addFinalizerExit(release)))
}

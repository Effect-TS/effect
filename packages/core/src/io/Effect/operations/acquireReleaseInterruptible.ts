import type { LazyArg } from "../../../data/Function"
import type { HasScope } from "../../Scope"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A variant of `acquireRelease` that allows the `acquire` effect to be
 * interruptible. Since the `acquire` effect could be interrupted after
 * partially acquiring resources, the `release` effect is not allowed to
 * access the resource produced by `acquire` and must independently determine
 * what finalization, if any, needs to be performed (e.g. by examining in
 * memory state).
 *
 * @tsplus static ets/EffectOps acquireReleaseInterruptible
 */
export function acquireReleaseInterruptible<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: LazyArg<RIO<R2, X>>,
  __tsplusTrace?: string
): Effect<R & R2 & HasScope, E, A> {
  return Effect.acquireReleaseInterruptibleExit(acquire, release)
}

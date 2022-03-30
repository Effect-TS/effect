import type { LazyArg } from "../../../data/Function"
import type { Exit } from "../../Exit/definition"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Executes the release effect only if there was an error.
 *
 * @tsplus static ets/EffectOps acquireReleaseOnErrorWith
 */
export function acquireReleaseOnErrorWith<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: (a: A) => Effect<R2, E2, A2>,
  release: (a: A, e: Exit<E2, A2>) => RIO<R3, X>,
  __tsplusTrace?: string
): Effect<R & R2 & R3, E | E2, A2> {
  return Effect.acquireReleaseExitWith(acquire, use, (a, e) =>
    e._tag === "Success" ? Effect.unit : release(a, e)
  )
}

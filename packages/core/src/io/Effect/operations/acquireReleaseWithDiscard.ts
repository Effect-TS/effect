import type { LazyArg } from "../../../data/Function"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * A less powerful variant of `acquireReleaseWith` where the resource acquired
 * by this effect is not needed.
 *
 * @tsplus static ets/EffectOps acquireReleaseWithDiscard
 */
export function acquireReleaseWithDiscard<R, E, A, R2, E2, A2, R3, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  use: LazyArg<Effect<R2, E2, A2>>,
  release: LazyArg<RIO<R3, X>>
): Effect<R & R2 & R3, E | E2, A2> {
  return Effect.acquireReleaseWith(acquire, use, release)
}

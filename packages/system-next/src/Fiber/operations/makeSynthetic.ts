// ets_tracing: off

import type { Fiber } from "../definition"
import { Synthetic } from "../definition"

/**
 * @ets_optimize identity
 */
export function makeSynthetic<E, A>(
  _: Omit<Synthetic<E, A>, "_tag" | symbol>
): Fiber<E, A> {
  return new Synthetic(
    _.id,
    _.await,
    _.children,
    _.inheritRefs,
    _.poll,
    _.getRef,
    _.interruptAs
  )
}

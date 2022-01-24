import type { Effect } from "../definition"
import { forEachDiscard_ } from "./excl-forEach"
import { fork } from "./fork"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than `forkAll`
 * in cases where the results of the forked fibers are not needed.
 *
 * @ets static ets/EffectOps forkAllDiscard
 */
export function forkAllDiscard<R, E, A>(
  effects: Iterable<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, never, void> {
  return forEachDiscard_(effects, fork, __etsTrace)
}

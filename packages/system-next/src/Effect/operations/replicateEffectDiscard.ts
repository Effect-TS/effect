// ets_tracing: off

import type { Effect } from "../definition"
import { collectAllDiscard } from "./excl-forEach"
import { replicate_ } from "./replicate"

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 */
export function replicateEffectDiscard_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __trace?: string
): Effect<R, E, void> {
  return collectAllDiscard(replicate_(self, n), __trace)
}

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 *
 * @ets_data_first replicateEffectDiscard_
 */
export function replicateEffectDiscard(n: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => replicateEffectDiscard_(self, n, __trace)
}

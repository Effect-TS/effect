// ets_tracing: off

import { range } from "../Collections/Immutable/Array/index.js"
import type { Effect } from "./effect.js"
import { collectAllUnit } from "./excl-forEach.js"

/**
 * Replicates the given effect `n` times.
 *
 * @ets_data_first replicate_
 */
export function replicate(n: number, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => replicate_(self, n)
}

/**
 * Replicates the given effect `n` times.
 */
export function replicate_<R, E, A>(self: Effect<R, E, A>, n: number) {
  return range(0, n).map(() => self)
}

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 */
export function replicateMUnit_<R, E, A>(
  self: Effect<R, E, A>,
  n: number
): Effect<R, E, void> {
  return collectAllUnit(replicate_(self, n))
}

/**
 * Performs this effect the specified number of times, discarding the
 * results.
 */
export function replicateMUnit(n: number) {
  return <R, E, A>(self: Effect<R, E, A>) => replicateMUnit_(self, n)
}

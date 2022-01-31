import { compact } from "../../../collection/immutable/Chunk/api/compact"
import type { Chunk } from "../../../collection/immutable/Chunk/core"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @tsplus static ets/EffectOps collect
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEach(self, (a) => f(a).unsome()).map(compact)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @ets_data_first collect_
 */
export function collect<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __etsTrace?: string
) {
  return (self: Iterable<A>): Effect<R, E, Chunk<B>> => collect_(self, f)
}

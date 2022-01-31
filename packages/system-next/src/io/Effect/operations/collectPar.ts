import { compact } from "../../../collection/immutable/Chunk/api/compact"
import type { Chunk } from "../../../collection/immutable/Chunk/core"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @ets static ets/EffectOps collectPar
 */
export function collectPar_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __etsTrace?: string
): Effect<R, E, Chunk<B>> {
  return Effect.forEachPar(self, (a) => f(a).unsome()).map(compact)
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @ets_data_first collectPar_
 */
export function collectPar<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __etsTrace?: string
) {
  return (self: Iterable<A>): Effect<R, E, Chunk<B>> => collectPar_(self, f)
}

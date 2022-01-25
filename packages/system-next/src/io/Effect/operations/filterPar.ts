import * as Chunk from "../../../collection/immutable/Chunk/api/compact"
import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { forEachPar_ } from "./excl-forEach"
import { map_ } from "./map"

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @ets static ets/EffectOps filterPar
 */
export function filterPar_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return map_(
    forEachPar_(as, (a) => map_(f(a), (b) => (b ? O.some(a) : O.none)), __etsTrace),
    Chunk.compact
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * @ets_data_first filterPar_
 */
export function filterPar<A, R, E>(
  f: (a: A) => Effect<R, E, boolean>,
  __etsTrace?: string
) {
  return (as: Iterable<A>) => filterPar_(as, f, __etsTrace)
}

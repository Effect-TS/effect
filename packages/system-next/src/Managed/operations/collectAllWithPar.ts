import * as Chunk from "../../Collections/Immutable/Chunk"
import type * as O from "../../Option"
import type { Managed } from "../definition"
import { collectAllPar } from "./collectAllPar"
import { map_ } from "./map"

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWithPar_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return map_(collectAllPar(as, __trace), Chunk.collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWithPar_
 */
export function collectAllWithPar<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>) => collectAllWithPar_(as, pf, __trace)
}

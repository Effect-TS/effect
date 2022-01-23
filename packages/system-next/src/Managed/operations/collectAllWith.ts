import { collect } from "../../Collections/Immutable/Chunk/api/collect"
import type * as Chunk from "../../Collections/Immutable/Chunk/core"
import type * as O from "../../Option"
import type { Managed } from "../definition"
import { collectAll } from "./collectAll"
import { map_ } from "./map"

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Managed<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Managed<R, E, Chunk.Chunk<B>> {
  return map_(collectAll(as, __trace), collect(pf))
}

/**
 * Evaluate each effect in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>, __trace?: string) {
  return <R, E>(as: Iterable<Managed<R, E, A>>) => collectAllWith_(as, pf, __trace)
}

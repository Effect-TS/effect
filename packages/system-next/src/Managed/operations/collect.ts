import type { Chunk } from "../../Collections/Immutable/Chunk"
import { compact } from "../../Collections/Immutable/Chunk/api/compact"
import type { Option } from "../../Option"
import type { Managed } from "../definition"
import { forEach_ } from "./forEach"
import { map_ } from "./map"
import { unsome } from "./unsome"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version,
 * see `collectPar`.
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Managed<R, Option<E>, B>
): Managed<R, E, Chunk<B>> {
  return map_(
    forEach_(self, (a) => unsome(f(a))),
    compact
  )
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version,
 * see `collectPar`.
 *
 * @ets_data_first collect_
 */
export function collect<A, R, E, B>(f: (a: A) => Managed<R, Option<E>, B>) {
  return (self: Iterable<A>): Managed<R, E, Chunk<B>> => collect_(self, f)
}

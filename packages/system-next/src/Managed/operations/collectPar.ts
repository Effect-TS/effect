// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk"
import type { Option } from "../../Option"
import type { Managed } from "../definition"
import { forEachPar_ } from "./forEachPar"
import { map_ } from "./map"
import { unsome } from "./unsome"

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 */
export function collectPar_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Managed<R, Option<E>, B>
): Managed<R, E, Chunk.Chunk<B>> {
  return map_(
    forEachPar_(self, (a) => unsome(f(a))),
    Chunk.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @ets_data_first collectPar_
 */
export function collectPar<A, R, E, B>(f: (a: A) => Managed<R, Option<E>, B>) {
  return (self: Iterable<A>): Managed<R, E, Chunk.Chunk<B>> => collectPar_(self, f)
}

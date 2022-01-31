// ets_tracing: off

import { compact } from "../Collections/Immutable/Chunk/api/compact.js"
import type { Chunk } from "../Collections/Immutable/Chunk/core.js"
import type { Option } from "../Option/index.js"
import type { Sync } from "./core.js"
import { map_ } from "./core.js"
import { forEach_ } from "./excl-forEach.js"
import { optional } from "./optional.js"

/**
 * Evaluate each sync in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @ets_data_first collect_
 */
export function collect<A, R, E, B>(f: (a: A) => Sync<R, Option<E>, B>) {
  return (self: Iterable<A>): Sync<R, E, Chunk<B>> => collect_(self, f)
}

/**
 * Evaluate each Sync in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Sync<R, Option<E>, B>
): Sync<R, E, Chunk<B>> {
  return map_(
    forEach_(self, (a) => optional(f(a))),
    compact
  )
}

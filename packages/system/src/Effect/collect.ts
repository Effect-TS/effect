// ets_tracing: off

import { compact } from "../Collections/Immutable/Chunk/api/compact.js"
import type * as Chunk from "../Collections/Immutable/Chunk/core.js"
import type { Option } from "../Option/index.js"
import type { Effect } from "./effect.js"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach.js"
import { map_ } from "./map.js"
import { optional } from "./optional.js"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @ets_data_first collect_
 */
export function collect<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
) {
  return (self: Iterable<A>): Effect<R, E, Chunk.Chunk<B>> => collect_(self, f, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map_(
    forEach_(self, (a) => optional(f(a)), __trace),
    compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @ets_data_first collectPar_
 */
export function collectPar<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
) {
  return (self: Iterable<A>): Effect<R, E, Chunk.Chunk<B>> =>
    collectPar_(self, f, __trace)
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 */
export function collectPar_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map_(
    forEachPar_(self, (a) => optional(f(a)), __trace),
    compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 */
export function collectParN_<A, R, E, B>(
  self: Iterable<A>,
  n: number,
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
): Effect<R, E, Chunk.Chunk<B>> {
  return map_(
    forEachParN_(self, n, (a) => optional(f(a)), __trace),
    compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 *
 * @ets_data_first collectParN_
 */
export function collectParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
): (self: Iterable<A>) => Effect<R, E, Chunk.Chunk<B>> {
  return (self) => collectParN_(self, n, f, __trace)
}

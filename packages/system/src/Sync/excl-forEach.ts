// ets_tracing: off

import * as ChunkCollect from "../Collections/Immutable/Chunk/api/collect.js"
import * as Chunk from "../Collections/Immutable/Chunk/core.js"
import { identity } from "../Function/index.js"
import type * as O from "../Option/index.js"
import type { Sync } from "./core.js"
import * as core from "./core.js"

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 */
export function forEach_<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => Sync<R, E, B>
): Sync<R, E, Chunk.Chunk<B>> {
  return core.suspend(() => {
    const acc: B[] = []

    return core.map_(
      forEachUnit_(as, (a) =>
        core.map_(f(a), (b) => {
          acc.push(b)
        })
      ),
      () => Chunk.from(acc)
    )
  })
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `forEachPar`.
 * If you do not need the results, see `forEachUnit` for a more efficient implementation.
 *
 * @ets_data_first forEach_
 */
export function forEach<A, R, E, B>(f: (a: A) => Sync<R, E, B>) {
  return (as: Iterable<A>) => forEach_(as, f)
}

function forEachUnitLoop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Sync<R, E, X>
): Sync<R, E, void> {
  const next = iterator.next()
  return next.done
    ? core.unit
    : core.chain_(f(next.value), () => forEachUnitLoop(iterator, f))
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced Syncs sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 */
export function forEachUnit_<R, E, A, X>(
  as: Iterable<A>,
  f: (a: A) => Sync<R, E, X>,
  __trace?: string
): Sync<R, E, void> {
  return core.suspend(() => forEachUnitLoop(as[Symbol.iterator](), f))
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced Syncs sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @ets_data_first forEachUnit_
 */
export function forEachUnit<R, E, A, X>(
  f: (a: A) => Sync<R, E, X>,
  __trace?: string
): (as: Iterable<A>) => Sync<R, E, void> {
  return (as) => forEachUnit_(as, f)
}

/**
 * Evaluate each Sync in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export function collectAll<R, E, A>(as: Iterable<Sync<R, E, A>>) {
  return forEach_(as, identity)
}

/**
 * Evaluate each Sync in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<R, E, A>(as: Iterable<Sync<R, E, A>>, __trace?: string) {
  return forEachUnit_(as, identity)
}

/**
 * Evaluate each Sync in the structure with `collectAll`, and collect
 * the results with given partial function.
 */
export function collectAllWith_<R, E, A, B>(
  as: Iterable<Sync<R, E, A>>,
  pf: (a: A) => O.Option<B>,
  __trace?: string
): Sync<R, E, Chunk.Chunk<B>> {
  return core.map_(collectAll(as), ChunkCollect.collect(pf))
}

/**
 * Evaluate each Sync in the structure with `collectAll`, and collect
 * the results with given partial function.
 *
 * @ets_data_first collectAllWith_
 */
export function collectAllWith<A, B>(pf: (a: A) => O.Option<B>) {
  return <R, E>(as: Iterable<Sync<R, E, A>>) => collectAllWith_(as, pf)
}

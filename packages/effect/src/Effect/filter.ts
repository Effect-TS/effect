import { compact } from "../Array"
import { flow, pipe } from "../Function"
import * as I from "../Iterable"
import * as O from "../Option"
import { succeed } from "./core"
import type { Effect } from "./effect"
import { foreachPar } from "./foreachPar"
import { foreachParN } from "./foreachParN"
import { map } from "./map"
import { map_ } from "./map_"
import { zipWith_ } from "./zipWith"

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter<A, R, E>(f: (a: A) => Effect<R, E, boolean>) {
  return (as: Iterable<A>) => filter_(as, f)
}

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, readonly A[]> {
  return I.reduce_(as, <Effect<R, E, A[]>>succeed([]), (io, a) =>
    zipWith_(io, f(a), (as_, p) => {
      if (p) {
        as_.push(a)
      }
      return as_
    })
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 */
export function filterPar_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
) {
  return pipe(
    as,
    foreachPar((a) => map_(f(a), (b) => (b ? O.some(a) : O.none))),
    map(compact)
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 */
export function filterPar<A, R, E>(f: (a: A) => Effect<R, E, boolean>) {
  return (as: Iterable<A>) => filterPar_(as, f)
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 */
export function filterParN_(n: number) {
  return <A, R, E>(as: Iterable<A>, f: (a: A) => Effect<R, E, boolean>) =>
    pipe(
      as,
      foreachParN(n)((a) => map_(f(a), (b) => (b ? O.some(a) : O.none))),
      map(compact)
    )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 *
 * This method will use up to `n` fibers.
 */
export function filterParN(n: number) {
  return <A, R, E>(f: (a: A) => Effect<R, E, boolean>) => (as: Iterable<A>) =>
    filterParN_(n)(as, f)
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 */
export function filterNot<A, R, E>(f: (a: A) => Effect<R, E, boolean>) {
  return (as: Iterable<A>) => filterNot_(as, f)
}

/**
 * Filters the collection using the specified effectual predicate, removing
 * all elements that satisfy the predicate.
 */
export function filterNot_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
) {
  return filter_(
    as,
    flow(
      f,
      map((b) => !b)
    )
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotPar_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
) {
  return filterPar_(
    as,
    flow(
      f,
      map((b) => !b)
    )
  )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotPar<A, R, E>(f: (a: A) => Effect<R, E, boolean>) {
  return (as: Iterable<A>) => filterNotPar_(as, f)
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotParN_(n: number) {
  return <A, R, E>(as: Iterable<A>, f: (a: A) => Effect<R, E, boolean>) =>
    filterParN_(n)(
      as,
      flow(
        f,
        map((b) => !b)
      )
    )
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filterNot` for a sequential version of it.
 */
export function filterNotParN(n: number) {
  return <A, R, E>(f: (a: A) => Effect<R, E, boolean>) => (as: Iterable<A>) =>
    filterNotParN_(n)(as, f)
}

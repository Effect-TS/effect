import * as A from "../Array"
import type { Option } from "../Option"
import type { Effect } from "./effect"
import { foreach_, foreachPar_, foreachParN_ } from "./foreach"
import { map_ } from "./map"
import { optional } from "./optional"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 */
export function collect<A, R, E, B>(f: (a: A) => Effect<R, Option<E>, B>) {
  return (self: Iterable<A>): Effect<R, E, readonly B[]> => collect_(self, f)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>
): Effect<R, E, readonly B[]> {
  return map_(
    foreach_(self, (a) => optional(f(a))),
    A.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 */
export function collectPar<A, R, E, B>(f: (a: A) => Effect<R, Option<E>, B>) {
  return (self: Iterable<A>): Effect<R, E, readonly B[]> => collectPar_(self, f)
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 */
export function collectPar_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>
): Effect<R, E, readonly B[]> {
  return map_(
    foreachPar_(self, (a) => optional(f(a))),
    A.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 */
export function collectParN_(
  n: number
): <A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>
) => Effect<R, E, readonly B[]> {
  return (self, f) =>
    map_(
      foreachParN_(self, n, (a) => optional(f(a))),
      A.compact
    )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 */
export function collectParN(
  n: number
): <A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>
) => (self: Iterable<A>) => Effect<R, E, readonly B[]> {
  const c = collectParN_(n)
  return (f) => (self) => c(self, f)
}

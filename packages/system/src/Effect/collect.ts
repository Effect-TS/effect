// tracing: off

import * as A from "../Array"
import type { Option } from "../Option"
import type { Effect } from "./effect"
import { forEach_, forEachPar_, forEachParN_ } from "./excl-forEach"
import { map_ } from "./map"
import { optional } from "./optional"

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 *
 * @dataFirst collect_
 */
export function collect<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
) {
  return (self: Iterable<A>): Effect<R, E, readonly B[]> => collect_(self, f, __trace)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version, see `collectPar`.
 */
export function collect_<A, R, E, B>(
  self: Iterable<A>,
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
): Effect<R, E, readonly B[]> {
  return map_(
    forEach_(self, (a) => optional(f(a)), __trace),
    A.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * @dataFirst collectPar_
 */
export function collectPar<A, R, E, B>(
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
) {
  return (self: Iterable<A>): Effect<R, E, readonly B[]> =>
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
): Effect<R, E, readonly B[]> {
  return map_(
    forEachPar_(self, (a) => optional(f(a)), __trace),
    A.compact
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
): Effect<R, E, readonly B[]> {
  return map_(
    forEachParN_(self, n, (a) => optional(f(a)), __trace),
    A.compact
  )
}

/**
 * Evaluate each effect in the structure in parallel, collecting the
 * the successful values and discarding the empty cases.
 *
 * Unlike `collectPar`, this method will use at most up to `n` fibers.
 *
 * @dataFirst collectParN_
 */
export function collectParN<A, R, E, B>(
  n: number,
  f: (a: A) => Effect<R, Option<E>, B>,
  __trace?: string
): (self: Iterable<A>) => Effect<R, E, readonly B[]> {
  return (self) => collectParN_(self, n, f, __trace)
}

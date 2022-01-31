// ets_tracing: off

import * as I from "../Iterable/index.js"
import { chain_, succeed, suspend } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduce_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>,
  __trace?: string
): Effect<R, E, Z> {
  return suspend(
    () =>
      I.reduce_(i, succeed(zero) as Effect<R, E, Z>, (acc, el) =>
        chain_(acc, (a) => f(a, el))
      ),
    __trace
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 *
 * @ets_data_first reduce_
 */
export function reduce<Z, R, E, A>(
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>,
  __trace?: string
) {
  return (i: Iterable<A>) => reduce_(i, zero, f, __trace)
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __trace?: string
): Effect<R, E, Z> {
  return suspend(
    () =>
      I.reduceRight_(i, succeed(zero) as Effect<R, E, Z>, (el, acc) =>
        chain_(acc, (a) => f(el, a))
      ),
    __trace
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 *
 * @ets_data_first reduceRight_
 */
export function reduceRight<R, E, A, Z>(
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>,
  __trace?: string
) {
  return (i: Iterable<A>) => reduceRight_(i, zero, f, __trace)
}

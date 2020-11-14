import * as A from "../Array"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduce_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect<R, E, Z>
): Effect<R, E, Z> {
  return A.reduce_(Array.from(i), succeed(zero) as Effect<R, E, Z>, (acc, el) =>
    chain_(acc, (a) => f(a, el))
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduce<A, Z, R, E>(zero: Z, f: (z: Z, a: A) => Effect<R, E, Z>) {
  return (i: Iterable<A>) => reduce_(i, zero, f)
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduceRight_<A, Z, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => Effect<R, E, Z>
): Effect<R, E, Z> {
  return A.reduceRight_(Array.from(i), succeed(zero) as Effect<R, E, Z>, (el, acc) =>
    chain_(acc, (a) => f(el, a))
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduceRight<A, Z, R, E>(zero: Z, f: (a: A, z: Z) => Effect<R, E, Z>) {
  return (i: Iterable<A>) => reduceRight_(i, zero, f)
}

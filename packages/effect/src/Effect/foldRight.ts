import * as A from "../Array"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function foldRight_<A, Z, S, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (a: A, z: Z) => Effect<S, R, E, Z>
): Effect<S, R, E, Z> {
  return A.reduceRight_(Array.from(i), succeed(zero) as Effect<S, R, E, Z>, (el, acc) =>
    chain_(acc, (a) => f(el, a))
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function foldRight<A, Z, S, R, E>(
  zero: Z,
  f: (a: A, z: Z) => Effect<S, R, E, Z>
) {
  return (i: Iterable<A>) => foldRight_(i, zero, f)
}

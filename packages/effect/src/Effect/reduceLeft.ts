import * as A from "../Array"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function reduceLeft_<A, Z, R, E>(
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
export function reduceLeft<A, Z, R, E>(zero: Z, f: (z: Z, a: A) => Effect<R, E, Z>) {
  return (i: Iterable<A>) => reduceLeft_(i, zero, f)
}

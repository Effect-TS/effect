import * as A from "../Array"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function foldLeft_<A, Z, S, R, E>(
  i: Iterable<A>,
  zero: Z,
  f: (z: Z, a: A) => Effect<S, R, E, Z>
): Effect<S, R, E, Z> {
  return A.reduce_(Array.from(i), succeed(zero) as Effect<S, R, E, Z>, (acc, el) =>
    chain_(acc, (a) => f(a, el))
  )
}

/**
 * Folds an Iterable[A] using an effectual function f, working sequentially from left to right.
 */
export function foldLeft<A, Z, S, R, E>(
  zero: Z,
  f: (z: Z, a: A) => Effect<S, R, E, Z>
) {
  return (i: Iterable<A>) => foldLeft_(i, zero, f)
}

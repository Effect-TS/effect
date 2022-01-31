// ets_tracing: off

import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as Map from "./map.js"

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossWith_<R, R1, E, E1, A, A1, C>(
  self: C.Stream<R, E, A>,
  that: C.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => C
): C.Stream<R & R1, E | E1, C> {
  return Chain.chain_(self, (l) => Map.map_(that, (r) => f(l, r)))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * @ets_data_first crossWith_
 */
export function crossWith<R1, E1, A, A1, C>(
  that: C.Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => C
) {
  return <R, E>(self: C.Stream<R, E, A>) => crossWith_(self, that, f)
}

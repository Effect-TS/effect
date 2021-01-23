import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { map_ } from "./map"

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream#zip` for the more common point-wise variant.
 */
export function crossWith_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
) {
  return <C>(f: (o: O, o2: O2) => C): Stream<R & R1, E | E1, C> =>
    chain_(self, (l) => map_(that, (r) => f(l, r)))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream#zip` for the more common point-wise variant.
 */
export function crossWith<R1, E1, O2>(that: Stream<R1, E1, O2>) {
  return <O, C>(f: (o: O, o2: O2) => C) => <R, E>(self: Stream<R, E, O>) =>
    crossWith_(self, that)(f)
}

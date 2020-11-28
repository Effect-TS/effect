import { crossWith_ } from "./crossWith"
import type { Stream } from "./definitions"

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also [[Stream#zip]] and [[Stream#<&>]] for the more common point-wise variant.
 */
export function cross_<R, R1, E, E1, O, O2>(
  self: Stream<R, E, O>,
  that: Stream<R1, E1, O2>
): Stream<R & R1, E | E1, readonly [O, O2]> {
  return crossWith_(self, that)((a, b) => [a, b] as const)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also [[Stream#zip]] and [[Stream#<&>]] for the more common point-wise variant.
 */
export function cross<R1, E1, O2>(that: Stream<R1, E1, O2>) {
  return <R, E, O>(self: Stream<R, E, O>) => cross_(self, that)
}

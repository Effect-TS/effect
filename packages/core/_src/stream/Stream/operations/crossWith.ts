/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements with a specified function. The `that` stream would be
 * run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus static effect/core/stream/Stream.Aspects crossWith
 * @tsplus pipeable effect/core/stream/Stream crossWith
 */
export function crossWith<R2, E2, B, A, C>(
  that: LazyArg<Stream<R2, E2, B>>,
  f: (a: A, b: B) => C,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, C> => self.flatMap((a) => that().map((b) => f(a, b)))
}

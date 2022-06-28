/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from that stream. The `that`
 * stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipRight` for the more common point-wise variant.
 *
 * @tsplus pipeable-operator effect/core/stream/Stream >
 * @tsplus static effect/core/stream/Stream.Aspects crossRight
 * @tsplus pipeable effect/core/stream/Stream crossRight
 */
export function crossRight<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => self.cross(that).map((tuple) => tuple.get(1))
}

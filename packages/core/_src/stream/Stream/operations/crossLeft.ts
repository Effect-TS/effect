/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from this stream. The `that`
 * stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipLeft` for the more common point-wise variant.
 *
 * @tsplus operator ets/Stream <
 * @tsplus fluent ets/Stream crossLeft
 */
export function crossLeft_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, B>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A> {
  return self.cross(that).map((tuple) => tuple.get(0));
}

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from this stream. The `that`
 * stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipLeft` for the more common point-wise variant.
 *
 * @tsplus static ets/Stream/Aspects crossLeft
 */
export const crossLeft = Pipeable(crossLeft_);

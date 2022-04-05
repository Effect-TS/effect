/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements with a specified function. The `that` stream would be
 * run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus fluent ets/Stream crossWith
 */
export function crossWith_<R, E, A, R2, E2, B, C>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, B>>,
  f: (a: A, b: B) => C,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, C> {
  return self.flatMap((a) => that().map((b) => f(a, b)));
}

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements with a specified function. The `that` stream would be
 * run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus static ets/Stream/Aspects crossWith
 */
export const crossWith = Pipeable(crossWith_);

import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../../Stream"

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from that stream. The `that`
 * stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipRight` for the more common point-wise variant.
 *
 * @tsplus operator ets/Stream >
 * @tsplus fluent ets/Stream crossRight
 */
export function crossRight_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, B>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, B> {
  return self.cross(that).map((tuple) => tuple.get(1))
}

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements, but keeps only elements from that stream. The `that`
 * stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `Stream.zipRight` for the more common point-wise variant.
 */
export const crossRight = Pipeable(crossRight_)

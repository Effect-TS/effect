import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements. The `that` stream would be run multiple times, for
 * every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus fluent ets/Stream cross
 */
export function cross_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, B>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, Tuple<[A, B]>> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.concatMap((a) => {
      const that0 = that()
      concreteStream(that0)
      return that0.channel.mapOut((b) => a.flatMap((a) => b.map((b) => Tuple(a, b))))
    })
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements. The `that` stream would be run multiple times, for
 * every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus static ets/Stream/Aspects cross
 */
export const cross = Pipeable(cross_)

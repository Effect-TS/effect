import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements. The `that` stream would be run multiple times, for
 * every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus fluent ets/Stream crossFlatten
 */
export function crossFlatten_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, B>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, MergeTuple<A, B>> {
  concreteStream(self)
  return new StreamInternal(
    self.channel.concatMap((a) => {
      const that0 = that()
      concreteStream(that0)
      return that0.channel.mapOut((b) =>
        a.flatMap((a) => b.map((b) => Tuple.mergeTuple(a, b)))
      )
    })
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements. The `that` stream would be run multiple times, for
 * every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 */
export const crossFlatten = Pipeable(crossFlatten_)

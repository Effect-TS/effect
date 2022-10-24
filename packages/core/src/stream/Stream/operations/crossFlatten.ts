import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Composes this stream with the specified stream to create a cartesian
 * product of elements. The `that` stream would be run multiple times, for
 * every element in the `this` stream.
 *
 * See also `Stream.zip` for the more common point-wise variant.
 *
 * @tsplus static effect/core/stream/Stream.Aspects crossFlatten
 * @tsplus pipeable effect/core/stream/Stream crossFlatten
 * @category mutations
 * @since 1.0.0
 */
export function crossFlatten<R2, E2, A2>(that: Stream<R2, E2, A2>) {
  return <R, E, A extends ReadonlyArray<any>>(
    self: Stream<R, E, A>
  ): Stream<R | R2, E | E2, readonly [...A, A2]> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.concatMap((a) => {
        concreteStream(that)
        return that.channel.mapOut((b) =>
          pipe(a, Chunk.flatMap((a) => pipe(b, Chunk.map((b) => [...a, b]))))
        )
      })
    )
  }
}

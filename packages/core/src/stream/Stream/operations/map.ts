import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects map
 * @tsplus pipeable effect/core/stream/Stream map
 * @category mapping
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, B> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut(Chunk.map(f)))
  }
}

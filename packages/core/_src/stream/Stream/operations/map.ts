import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects map
 * @tsplus pipeable effect/core/stream/Stream map
 */
export function map<A, B>(f: (a: A) => B, __tsplusTrace?: string) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, B> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut((chunk) => chunk.map(f)))
  }
}

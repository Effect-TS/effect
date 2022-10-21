import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Returns a stream made of the concatenation in strict order of all the
 * streams produced by passing each element of this stream to `f0`
 *
 * @tsplus static effect/core/stream/Stream.Aspects flatMap
 * @tsplus pipeable effect/core/stream/Stream flatMap
 */
export function flatMap<A, R2, E2, B>(f: (a: A) => Stream<R2, E2, B>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, B> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.concatMap((as) =>
        as
          .map(f)
          .map((stream) => {
            concreteStream(stream)
            return stream.channel
          })
          .reduce(
            Channel.unit as Channel<R2, unknown, unknown, unknown, E2, Chunk<B>, unknown>,
            (c1, c2) => c1.flatMap(() => c2)
          )
      )
    )
  }
}

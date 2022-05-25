import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Returns a stream made of the concatenation in strict order of all the
 * streams produced by passing each element of this stream to `f0`
 *
 * @tsplus fluent ets/Stream flatMap
 */
export function flatMap_<R, E, A, R2, E2, B>(
  self: Stream<R, E, A>,
  f: (a: A) => Stream<R2, E2, B>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, B> {
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
          (c1, c2) => c1 > c2
        )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the
 * streams produced by passing each element of this stream to `f0`
 *
 * @tsplus static ets/Stream/Aspects flatMap
 */
export const flatMap = Pipeable(flatMap_)

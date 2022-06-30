import { MergeStrategy } from "@effect/core/stream/Channel/MergeStrategy"
import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. When a new stream is created from an element of the source
 * stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this
 * operator.
 *
 * @tsplus static effect/core/stream/Stream.Aspects flatMapParSwitch
 * @tsplus pipeable effect/core/stream/Stream flatMapParSwitch
 */
export function flatMapParSwitch<R2, E2, A, B>(
  n: number,
  f: (a: A) => Stream<R2, E2, B>,
  bufferSize = 16,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, B> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.concatMap(Channel.writeChunk).mergeMap(
        n,
        (a: A) => {
          const stream = f(a)
          concreteStream(stream)
          return stream.channel
        },
        bufferSize,
        MergeStrategy.BufferSliding
      )
    )
  }
}

import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";
import { RingBufferNew } from "@effect-ts/core/support/RingBufferNew";

/**
 * Drops the last specified number of elements from this stream.
 *
 * Note: this combinator keeps `n` elements in memory. Be careful with big
 * numbers.
 *
 * @tsplus fluent ets/Stream dropRight
 */
export function dropRight_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  if (n <= 0) {
    return self;
  }
  return Stream.succeed(new RingBufferNew<A>(n)).flatMap((queue) => {
    const reader: Channel<
      unknown,
      E,
      Chunk<A>,
      unknown,
      E,
      Chunk<A>,
      void
    > = Channel.readWith(
      (chunk: Chunk<A>) => {
        const outs = chunk.collect((elem) => {
          const head = queue.head();
          queue.put(elem);
          return head;
        });
        return Channel.write(outs) > reader;
      },
      (err) => Channel.fail(err),
      () => Channel.unit
    );
    concreteStream(self);
    return new StreamInternal(self.channel >> reader);
  });
}

/**
 * Drops the last specified number of elements from this stream.
 *
 * Note: this combinator keeps `n` elements in memory. Be careful with big
 * numbers.
 *
 * @tsplus static ets/Stream/Aspects dropRight
 */
export const dropRight = Pipeable(dropRight_);

import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Halts the evaluation of this stream when the provided deferred resolves.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus static effect/core/stream/Stream.Aspects haltWhenDeferred
 * @tsplus pipeable effect/core/stream/Stream haltWhenDeferred
 * @category mutations
 * @since 1.0.0
 */
export function haltWhenDeferred<E2, Z>(deferred: Deferred<E2, Z>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E | E2, A> => {
    const writer: Channel<
      R,
      E,
      Chunk<A>,
      unknown,
      E | E2,
      Chunk<A>,
      void
    > = Channel.unwrap(
      deferred.poll
        .map((option) => {
          switch (option._tag) {
            case "None": {
              return Channel.readWith(
                (input: Chunk<A>) => Channel.write(input).flatMap(() => writer),
                (err) => Channel.fail(err),
                () => Channel.unit
              )
            }
            case "Some": {
              return Channel.unwrap(
                option.value.fold(
                  (e) => Channel.fail(e),
                  () => Channel.unit
                )
              )
            }
          }
        })
    )
    concreteStream(self)
    return new StreamInternal(self.channel.pipeTo(writer))
  }
}

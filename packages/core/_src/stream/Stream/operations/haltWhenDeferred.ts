import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Halts the evaluation of this stream when the provided deferred resolves.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus static effect/core/stream/Stream.Aspects haltWhenDeferred
 * @tsplus pipeable effect/core/stream/Stream haltWhenDeferred
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
        .map((option) =>
          option.fold(
            Channel.readWith(
              (input: Chunk<A>) => Channel.write(input) > writer,
              (err) => Channel.failSync(err),
              () => Channel.unit
            ),
            (io) =>
              Channel.unwrap(
                io.fold(
                  (e) => Channel.failSync(e),
                  () => Channel.unit
                )
              )
          )
        )
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> writer)
  }
}

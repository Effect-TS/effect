import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Halts the evaluation of this stream when the provided deferred resolves.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus fluent ets/Stream haltWhenDeferred
 */
export function haltWhenDeferred_<R, E, A, E2, Z>(
  self: Stream<R, E, A>,
  deferred: LazyArg<Deferred<E2, Z>>,
  __tsplusTrace?: string
): Stream<R, E | E2, A> {
  const writer: Channel<
    R,
    E,
    Chunk<A>,
    unknown,
    E | E2,
    Chunk<A>,
    void
  > = Channel.unwrap(
    deferred()
      .poll()
      .map((option) =>
        option.fold(
          Channel.readWith(
            (input: Chunk<A>) => Channel.write(input) > writer,
            (err) => Channel.fail(err),
            () => Channel.unit
          ),
          (io) =>
            Channel.unwrap(
              io.fold(
                (e) => Channel.fail(e),
                () => Channel.unit
              )
            )
        )
      )
  );
  concreteStream(self);
  return new StreamInternal(self.channel >> writer);
}

/**
 * Halts the evaluation of this stream when the provided deferred resolves.
 *
 * If the deferred completes with a failure, the stream will emit that failure.
 *
 * @tsplus static ets/Stream/Aspects haltWhenDeferred
 */
export const haltWhenDeferred = Pipeable(haltWhenDeferred_);

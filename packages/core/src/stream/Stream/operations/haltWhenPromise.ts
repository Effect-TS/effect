import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import type { Promise } from "../../../io/Promise"
import { Channel } from "../../Channel"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 *
 * @tsplus fluent ets/Stream haltWhenPromise
 */
export function haltWhenPromise_<R, E, A, E2, Z>(
  self: Stream<R, E, A>,
  promise: LazyArg<Promise<E2, Z>>,
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
    promise()
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
  )
  concreteStream(self)
  return new StreamInternal(self.channel >> writer)
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export const haltWhenPromise = Pipeable(haltWhenPromise_)

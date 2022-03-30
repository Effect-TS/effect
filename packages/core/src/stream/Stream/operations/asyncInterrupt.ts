import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Either } from "../../../data/Either"
import { isFiberFailure } from "../../../io/Cause"
import { Effect } from "../../../io/Effect"
import { Queue } from "../../../io/Queue"
import { Channel } from "../../Channel"
import { Take } from "../../Take"
import { Stream } from "../definition"
import type { Canceler } from "../Emit"
import { Emit } from "../Emit"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback returns either a canceler or
 * synchronously returns a stream. The optionality of the error type `E` can be
 * used to signal the end of the stream, by setting it to `None`.
 *
 * @tsplus static ets/StreamOps asyncInterrupt
 */
export function asyncInterrupt<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => Either<Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.unwrapScoped(
    Effect.Do()
      .bind("output", () =>
        Effect.acquireRelease(
          Queue.bounded<Take<E, A>>(outputBuffer),
          (queue) => queue.shutdown
        )
      )
      .bind("runtime", () => Effect.runtime<R>())
      .bind("eitherStream", ({ output, runtime }) =>
        Effect.succeed<Either<Canceler<R>, Stream<R, E, A>>>(
          register(
            Emit((k) => {
              try {
                runtime.unsafeRun(
                  Take.fromPull(k).flatMap((take) => output.offer(take))
                )
              } catch (e: unknown) {
                if (isFiberFailure(e)) {
                  if (!e.cause.isInterrupted()) {
                    throw e
                  }
                }
              }
            })
          )
        )
      )
      .map(({ eitherStream, output }) =>
        eitherStream.fold(
          (canceler) => {
            const loop: Channel<
              unknown,
              unknown,
              unknown,
              unknown,
              E,
              Chunk<A>,
              void
            > = Channel.unwrap(
              output.take
                .flatMap((take) => take.done())
                .fold(
                  (maybeError) =>
                    Channel.fromEffect(output.shutdown) >
                    maybeError.fold(Channel.unit, (e) => Channel.fail(e)),
                  (a) => Channel.write(a) > loop
                )
            )
            return (new StreamInternal(loop) as Stream<R, E, A>).ensuring(canceler)
          },
          (stream) => Stream.unwrap(output.shutdown.as(stream))
        )
      )
  )
}

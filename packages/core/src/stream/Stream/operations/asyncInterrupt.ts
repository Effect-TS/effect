import { isFiberFailure } from "@effect/core/io/Cause/errors"
import { Emit } from "@effect/core/stream/Stream/Emit"
import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Either } from "@fp-ts/data/Either"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback returns either a canceler or
 * synchronously returns a stream. The optionality of the error type `E` can be
 * used to signal the end of the stream, by setting it to `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops asyncInterrupt
 * @category async
 * @since 1.0.0
 */
export function asyncInterrupt<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => Either<Effect<R, never, void>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return Stream.unwrapScoped(
    Do(($) => {
      const output = $(Effect.acquireRelease(
        Queue.bounded<Take<E, A>>(outputBuffer),
        (queue) => queue.shutdown
      ))
      const runtime = $(Effect.runtime<R>())
      const eitherStream = $(Effect.sync<Either<Effect<R, never, void>, Stream<R, E, A>>>(
        register(
          Emit(async (k) => {
            try {
              runtime.unsafeRunPromise(
                Take.fromPull(k).flatMap((take) => output.offer(take))
              )
            } catch (e: unknown) {
              if (isFiberFailure(e)) {
                if (!e.cause.isInterrupted) {
                  throw e
                }
              }
            }
          })
        )
      ))
      switch (eitherStream._tag) {
        case "Left": {
          const loop: Channel<
            unknown,
            unknown,
            unknown,
            unknown,
            E,
            Chunk<A>,
            void
          > = Channel.unwrap(
            output.take.flatMap((take) => take.done).fold(
              (option) =>
                Channel.fromEffect(output.shutdown).flatMap(() => {
                  switch (option._tag) {
                    case "None": {
                      return Channel.unit
                    }
                    case "Some": {
                      return Channel.fail(option.value)
                    }
                  }
                }),
              (a) => Channel.write(a).flatMap(() => loop)
            )
          )
          return (new StreamInternal(loop) as Stream<R, E, A>).ensuring(eitherStream.left)
        }
        case "Right": {
          return Stream.unwrap(output.shutdown.as(eitherStream.right))
        }
      }
    })
  )
}

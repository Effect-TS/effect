import { isFiberFailure } from "@effect/core/io/Cause/errors"
import { Emit } from "@effect/core/stream/Stream/Emit"
import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times The registration of the callback itself returns an effect. The
 * optionality of the error type `E` can be used to signal the end of the
 * stream, by setting it to `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops asyncEffect
 * @category async
 * @since 1.0.0
 */
export function asyncEffect<R, E, A, Z>(
  register: (emit: Emit<R, E, A, void>) => Effect<R, E, Z>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new StreamInternal(
    Channel.unwrapScoped(
      Do(($) => {
        const output = $(Effect.acquireRelease(
          Queue.bounded<Take<E, A>>(outputBuffer),
          (queue) => queue.shutdown
        ))
        const runtime = $(Effect.runtime<R>())
        $(register(
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
        ))
        const loop: Channel<
          never,
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
        return loop
      })
    )
  )
}

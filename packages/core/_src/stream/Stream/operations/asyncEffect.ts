import { isFiberFailure } from "@effect/core/io/Cause/errors"
import { Emit } from "@effect/core/stream/Stream/Emit"
import { StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times The registration of the callback itself returns an effect. The
 * optionality of the error type `E` can be used to signal the end of the
 * stream, by setting it to `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops asyncEffect
 */
export function asyncEffect<R, E, A, Z>(
  register: (emit: Emit<R, E, A, void>) => Effect<R, E, Z>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new StreamInternal(
    Channel.unwrapScoped(
      Effect.Do()
        .bind("output", () =>
          Effect.acquireRelease(
            Queue.bounded<Take<E, A>>(outputBuffer),
            (queue) => queue.shutdown
          ))
        .bind("runtime", () => Effect.runtime<R>())
        .tap(({ output, runtime }) =>
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
        )
        .map(({ output }) => {
          const loop: Channel<
            never,
            unknown,
            unknown,
            unknown,
            E,
            Chunk<A>,
            void
          > = Channel.unwrap(
            output.take
              .flatMap((take) => take.done)
              .fold(
                (maybeError) =>
                  Channel.fromEffect(output.shutdown) >
                    maybeError.fold(Channel.unit, (e) => Channel.fail(e)),
                (a) => Channel.write(a) > loop
              )
          )
          return loop
        })
    )
  )
}

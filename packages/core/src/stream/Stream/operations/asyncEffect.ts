import type { Chunk } from "../../../collection/immutable/Chunk"
import { isFiberFailure } from "../../../io/Cause"
import { Effect } from "../../../io/Effect"
import { Queue } from "../../../io/Queue"
import { Channel } from "../../Channel"
import { Take } from "../../Take"
import type { Stream } from "../definition"
import { Emit } from "../Emit"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times The registration of the callback itself returns an effect. The
 * optionality of the error type `E` can be used to signal the end of the
 * stream, by setting it to `None`.
 *
 * @tsplus static ets/StreamOps asyncEffect
 */
export function asyncEffect<R, E, A, Z>(
  register: (emit: Emit<R, E, A, void>) => Effect<R, E, Z>,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(
    Channel.unwrapScoped(
      Effect.Do()
        .bind("output", () =>
          Effect.acquireRelease(
            Queue.bounded<Take<E, A>>(outputBuffer),
            (queue) => queue.shutdown
          )
        )
        .bind("runtime", () => Effect.runtime<R>())
        .tap(({ output, runtime }) =>
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
        .map(({ output }) => {
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
          return loop
        })
    )
  )
}

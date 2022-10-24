import { isFiberFailure } from "@effect/core/io/Cause/errors"
import type { Chunk } from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback itself returns an a scoped
 * resource. The optionality of the error type `E` can be used to signal the
 * end of the stream, by setting it to `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops asyncScoped
 * @category async
 * @since 1.0.0
 */
export function asyncScoped<R, E, A>(
  register: (
    f: (effect: Effect<R, Option<E>, Chunk<A>>) => void
  ) => Effect<R | Scope, E, unknown>,
  outputBuffer = 16
): Stream<R, E, A> {
  return Stream.scoped(
    Do(($) => {
      const output = $(
        Effect.acquireRelease(Queue.bounded<Take<E, A>>(outputBuffer), (queue) => queue.shutdown)
      )
      const runtime = $(Effect.runtime<R>())
      $(register(async (k) => {
        try {
          runtime.unsafeRunPromise(Take.fromPull(k).flatMap((take) => output.offer(take)))
        } catch (e: unknown) {
          if (isFiberFailure(e)) {
            if (!e.cause.isInterrupted) {
              throw e
            }
          }
        }
      }))
      const done = $(Ref.make(false))
      return done.get.flatMap((isDone) =>
        isDone ?
          Pull.end :
          output.take
            .flatMap((take) => take.done)
            .onError(() => done.set(true).zipRight(output.shutdown))
      )
    })
  ).flatMap((pull) => Stream.repeatEffectChunkOption(pull))
}

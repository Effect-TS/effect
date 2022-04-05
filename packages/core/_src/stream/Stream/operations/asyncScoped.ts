import { isFiberFailure } from "@effect-ts/core/io/Cause/errors";

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback itself returns an a scoped
 * resource. The optionality of the error type `E` can be used to signal the
 * end of the stream, by setting it to `None`.
 *
 * @tsplus static ets/Stream/Ops asyncScoped
 */
export function asyncScoped<R, E, A>(
  register: (
    f: (effect: Effect<R, Option<E>, Chunk<A>>) => void
  ) => Effect<R & HasScope, E, unknown>,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.scoped(
    Effect.Do()
      .bind("output", () =>
        Effect.acquireRelease(
          Queue.bounded<Take<E, A>>(outputBuffer),
          (queue) => queue.shutdown
        ))
      .bind("runtime", () => Effect.runtime<R>())
      .tap(({ output, runtime }) =>
        register((k) => {
          try {
            runtime.unsafeRun(Take.fromPull(k).flatMap((take) => output.offer(take)));
          } catch (e: unknown) {
            if (isFiberFailure(e)) {
              if (!e.cause.isInterrupted()) {
                throw e;
              }
            }
          }
        })
      )
      .bind("done", () => Ref.make(false))
      .map(({ done, output }) =>
        done
          .get()
          .flatMap((isDone) =>
            isDone
              ? Pull.end
              : output.take
                .flatMap((take) => take.done())
                .onError(() => done.set(true) > output.shutdown)
          )
      )
  ).flatMap((pull) => Stream.repeatEffectChunkOption(pull));
}

import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Option } from "../../../data/Option"
import { isFiberFailure } from "../../../io/Cause"
import { Effect } from "../../../io/Effect"
import { Managed } from "../../../io/Managed"
import { Queue } from "../../../io/Queue"
import { Ref } from "../../../io/Ref"
import { Pull } from "../../Pull"
import { Take } from "../../Take"
import { Stream } from "../definition"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback itself returns an a managed
 * resource. The optionality of the error type `E` can be used to signal the
 * end of the stream, by setting it to `None`.
 *
 * @tsplus static ets/StreamOps asyncManaged
 */
export function asyncManaged<R, E, A>(
  register: (
    f: (effect: Effect<R, Option<E>, Chunk<A>>) => void
  ) => Managed<R, E, unknown>,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.managed(
    Managed.Do()
      .bind("output", () =>
        Queue.bounded<Take<E, A>>(outputBuffer).toManagedWith((queue) =>
          queue.shutdown()
        )
      )
      .bind("runtime", () => Effect.runtime<R>().toManaged())
      .tap(({ output, runtime }) =>
        register((k) => {
          try {
            runtime.unsafeRunAsync(
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
      .bind("done", () => Ref.makeManaged(false))
      .map(({ done, output }) =>
        done.get().flatMap((isDone) =>
          isDone
            ? Pull.end
            : output
                .take()
                .flatMap((take) => take.done())
                .onError(() => done.set(true) > output.shutdown())
        )
      )
  ).flatMap((pull) => Stream.repeatEffectChunkOption(pull))
}

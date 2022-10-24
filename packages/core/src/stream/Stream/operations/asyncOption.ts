import type { Emit } from "@effect/core/stream/Stream/Emit"
import * as Either from "@fp-ts/data/Either"
import type { Option } from "@fp-ts/data/Option"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback can possibly return the stream
 * synchronously. The optionality of the error type `E` can be used to signal
 * the end of the stream, by setting it to `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops asyncOption
 * @category async
 * @since 1.0.0
 */
export function asyncOption<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return Stream.asyncInterrupt(
    (emit) => Either.fromOption(Effect.unit)(register(emit)),
    outputBuffer
  )
}

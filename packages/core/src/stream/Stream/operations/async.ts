import type { Emit } from "@effect/core/stream/Stream/Emit"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The optionality of the error type `E` can be used to signal the end
 * of the stream, by setting it to `None`.
 *
 * @tsplus static effect/core/stream/Stream.Ops async
 * @category async
 * @since 1.0.0
 */
export function _async<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return Stream.asyncOption((callback) => {
    register(callback)
    return Option.none
  }, outputBuffer)
}

export { _async as async }

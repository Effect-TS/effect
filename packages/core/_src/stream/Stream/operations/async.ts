import type { Emit } from "@effect/core/stream/Stream/Emit";

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The optionality of the error type `E` can be used to signal the end
 * of the stream, by setting it to `None`.
 *
 * @tsplus static ets/Stream/Ops async
 */
export function _async<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => void,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.asyncMaybe((callback) => {
    register(callback);
    return Option.none;
  }, outputBuffer);
}

export { _async as async };

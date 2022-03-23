import { Either } from "../../../data/Either"
import type { Option } from "../../../data/Option"
import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"
import type { Emit } from "../Emit"

/**
 * Creates a stream from an asynchronous callback that can be called multiple
 * times. The registration of the callback can possibly return the stream
 * synchronously. The optionality of the error type `E` can be used to signal
 * the end of the stream, by setting it to `None`.
 *
 * @tsplus static ets/StreamOps asyncMaybe
 */
export function asyncMaybe<R, E, A>(
  register: (emit: Emit<R, E, A, void>) => Option<Stream<R, E, A>>,
  outputBuffer = 16,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.asyncInterrupt(
    (emit) => Either.fromOption(register(emit), Effect.unit),
    outputBuffer
  )
}

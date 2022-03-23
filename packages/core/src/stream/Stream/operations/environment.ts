import { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Accesses the whole environment of the stream.
 *
 * @tsplus static ets/StreamOps environment
 */
export function environment<R>(__tsplusTrace?: string): Stream<R, never, R> {
  return Stream.fromEffect(Effect.environment<R>())
}

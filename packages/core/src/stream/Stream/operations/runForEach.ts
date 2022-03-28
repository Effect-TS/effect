import type { Effect } from "../../../io/Effect"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @tsplus fluent ets/Stream runForEach
 */
export function runForEach_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, Z>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, void> {
  return self.run(Sink.forEach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 */
export const runForEach = Pipeable(runForEach_)

import type { Effect } from "../../../io/Effect"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 *
 * @tsplus fluent ets/Stream runForEachWhile
 */
export function runForEachWhile_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, void> {
  return self.run(Sink.forEachWhile(f))
}

/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 */
export const runForEachWhile = Pipeable(runForEachWhile_)

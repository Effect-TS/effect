import type { Effect } from "../../../io/Effect"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Runs the stream and emits the number of elements processed.
 *
 * @tsplus fluent ets/Stream runCount
 */
export function runCount<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, number> {
  return self.run(Sink.count())
}

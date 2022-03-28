import type { Effect } from "../../../io/Effect"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Runs the stream to a sink which sums elements, provided they are numbers.
 *
 * @tsplus fluent ets/Stream runSum
 */
export function runSum<R, E, A>(
  self: Stream<R, E, number>,
  __tsplusTrace?: string
): Effect<R, E, number> {
  return self.run(Sink.sum())
}

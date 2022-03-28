import type { Effect } from "../../../io/Effect"
import { Sink } from "../../Sink"
import type { Stream } from "../definition"

/**
 * Returns a combined string resulting from concatenating each of the values
 * from the stream.
 *
 * @tsplus fluent ets/Stream mkString
 */
export function mkString<R, E, A>(
  self: Stream<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, string> {
  return self.run(Sink.mkString())
}

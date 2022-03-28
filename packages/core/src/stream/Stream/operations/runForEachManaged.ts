import type { Effect } from "../../../io/Effect"
import type { Managed } from "../../../io/Managed"
import { Sink } from "../../Sink"
import type { Stream } from "../definition"

/**
 * Like `Stream.forEach`, but returns a `Managed` so the finalization
 * order can be controlled.
 *
 * @tsplus fluent ets/Stream runForEachManaged
 */
export function runForEachManaged_<R, E, A, R1, E1, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, Z>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, void> {
  return self.runManaged(Sink.forEach(f))
}

/**
 * Like `Stream.forEach`, but returns a `Managed` so the finalization
 * order can be controlled.
 */
export const runForEachManaged = Pipeable(runForEachManaged_)

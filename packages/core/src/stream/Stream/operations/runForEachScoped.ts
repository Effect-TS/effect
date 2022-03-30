import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Sink } from "../../Sink"
import type { Stream } from "../definition"

/**
 * Like `Stream.forEach`, but returns an `Effect` so the finalization
 * order can be controlled.
 *
 * @tsplus fluent ets/Stream runForEachScoped
 */
export function runForEachScoped_<R, E, A, R1, E1, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R1, E1, Z>,
  __tsplusTrace?: string
): Effect<R & R1 & HasScope, E | E1, void> {
  return self.runScoped(Sink.forEach(f))
}

/**
 * Like `Stream.forEach`, but returns an `Effect` so the finalization
 * order can be controlled.
 */
export const runForEachScoped = Pipeable(runForEachScoped_)

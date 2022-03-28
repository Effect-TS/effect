import type { Effect } from "../../../io/Effect"
import type { Managed } from "../../../io/Managed"
import { Sink } from "../../Sink"
import type { Stream } from "../../Stream"

/**
 * Like `Stream.runForeachWhile`, but returns a `Managed` so the
 * finalization order can be controlled.
 *
 * @tsplus fluent ets/Stream runForEachWhileManaged
 */
export function runForEachWhileManaged_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, void> {
  return self.runManaged(Sink.forEachWhile(f))
}

/**
 * Like `Stream.runForeachWhile`, but returns a `Managed` so the
 * finalization order can be controlled.
 */
export const runForEachWhileManaged = Pipeable(runForEachWhileManaged_)

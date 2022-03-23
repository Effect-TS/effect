import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Managed } from "../../../io/Managed"
import type { Stream } from "../definition"

/**
 * Executes an effectful fold over the stream of values. Returns a Managed
 * value that represents the scope of the stream.
 *
 * @tsplus fluent ets/Stream runFoldManagedEffect
 */
export function runFoldManagedEffect_<R, E, A, R2, E2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, S> {
  return self.runFoldWhileManagedEffect(s, constTrue, f)
}

/**
 * Executes an effectful fold over the stream of values. Returns a Managed
 * value that represents the scope of the stream.
 */
export const runFoldManagedEffect = Pipeable(runFoldManagedEffect_)

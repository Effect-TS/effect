import type { LazyArg, Predicate } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { Managed } from "../../../io/Managed"
import { Sink } from "../../Sink"
import type { Stream } from "../definition"

/**
 * Executes an effectful fold over the stream of values. Returns a Managed
 * value that represents the scope of the stream. Stops the fold early when
 * the condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 *
 * @tsplus fluent ets/Stream runFoldWhileManagedEffect
 */
export function runFoldWhileManagedEffect_<R, E, A, R2, E2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Managed<R & R2, E | E2, S> {
  return self.runManaged(Sink.foldEffect(s, cont, f))
}

/**
 * Executes an effectful fold over the stream of values. Returns a Managed
 * value that represents the scope of the stream. Stops the fold early when
 * the condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 */
export const runFoldWhileManagedEffect = Pipeable(runFoldWhileManagedEffect_)

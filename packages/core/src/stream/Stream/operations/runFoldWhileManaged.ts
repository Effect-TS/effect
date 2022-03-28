import type { LazyArg, Predicate } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import { Sink } from "../../Sink"
import type { Stream } from "../definition"

/**
 * Executes a pure fold over the stream of values. Returns a Managed value
 * that represents the scope of the stream. Stops the fold early when the
 * condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 *
 * @tsplus fluent ets/Stream runFoldWhileManaged
 */
export function runFoldWhileManaged_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Managed<R, E, S> {
  return self.runManaged(Sink.fold(s, cont, f))
}

/**
 * Executes a pure fold over the stream of values. Returns a Managed value
 * that represents the scope of the stream. Stops the fold early when the
 * condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 */
export const runFoldWhileManaged = Pipeable(runFoldWhileManaged_)

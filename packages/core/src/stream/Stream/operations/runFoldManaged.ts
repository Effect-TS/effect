import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import type { Stream } from "../definition"

/**
 * Executes a pure fold over the stream of values. Returns a Managed value
 * that represents the scope of the stream.
 *
 * @tsplus fluent ets/Stream runFoldManaged
 */
export function runFoldManaged_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Managed<R, E, S> {
  return self.runFoldWhileManaged(s, constTrue, f)
}

/**
 * Executes a pure fold over the stream of values. Returns a Managed value
 * that represents the scope of the stream.
 */
export const runFoldManaged = Pipeable(runFoldManaged_)

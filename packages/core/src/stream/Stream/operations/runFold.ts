import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @tsplus fluent ets/Stream runFold
 */
export function runFold_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Effect<R, E, S> {
  return Effect.scoped(self.runFoldWhileScoped(s, constTrue, f))
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 */
export const runFold = Pipeable(runFold_)

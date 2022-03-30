import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import type { Stream } from "../definition"

/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream.
 *
 * @tsplus fluent ets/Stream runFoldScoped
 */
export function runFoldScoped_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Effect<R & HasScope, E, S> {
  return self.runFoldWhileScoped(s, constTrue, f)
}

/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream.
 */
export const runFoldScoped = Pipeable(runFoldScoped_)

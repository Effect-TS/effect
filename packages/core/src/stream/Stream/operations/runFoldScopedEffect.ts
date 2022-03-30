import type { LazyArg } from "../../../data/Function"
import { constTrue } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import type { Stream } from "../definition"

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 *
 * @tsplus fluent ets/Stream runFoldScopedEffect
 */
export function runFoldScopedEffect_<R, E, A, R2, E2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Effect<R & R2 & HasScope, E | E2, S> {
  return self.runFoldWhileScopedEffect(s, constTrue, f)
}

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 */
export const runFoldScopedEffect = Pipeable(runFoldScopedEffect_)

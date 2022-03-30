import type { LazyArg, Predicate } from "../../../data/Function"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled.
 *
 * @tsplus fluent ets/Stream runFoldWhileEffect
 */
export function runFoldWhileEffect_<R, E, A, R2, E2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, S> {
  return Effect.scoped(self.runFoldWhileScopedEffect(s, cont, f))
}

/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled.
 */
export const runFoldWhileEffect = Pipeable(runFoldWhileEffect_)

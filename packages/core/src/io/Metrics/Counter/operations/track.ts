import type { Effect } from "../../../Effect"
import type { Counter } from "../definition"
import { concreteCounter } from "./_internal/InternalCounter"

/**
 * @tsplus fluent ets/Counter track
 */
export function track<A, R, E, A1 extends A>(
  self: Counter<A>,
  effect: Effect<R, E, A1>,
  __tsplusTrace?: string
): Effect<R, E, A1> {
  concreteCounter(self)
  return self._track(effect)
}

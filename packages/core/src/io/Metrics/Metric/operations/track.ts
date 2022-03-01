import type { Effect } from "../../../Effect"
import type { Metric } from "../definition"
import { concreteMetric } from "../definition"

/**
 * @tsplus fluent ets/Metric track
 */
export function track<A, R, E, A1 extends A>(
  self: Metric<A>,
  effect: Effect<R, E, A1>,
  __tsplusTrace?: string
): Effect<R, E, A1> {
  concreteMetric(self)
  return self._track(effect)
}

import type { Effect } from "../../../Effect"
import type { Metric } from "../definition"
import { concreteMetric } from "../definition"

/**
 * @tsplus static ets/MetricOps track
 */
export function track<A>(metric: Metric<A>) {
  return <R, E, A1 extends A>(
    effect: Effect<R, E, A1>,
    __tsplusTrace?: string
  ): Effect<R, E, A1> => {
    concreteMetric(metric)
    return metric._track(effect)
  }
}

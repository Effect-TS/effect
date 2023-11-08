import type { Effect } from "./Effect.js"
import type { Metric } from "./Metric.js"
import type { PollingMetricTypeId } from "./MetricPolling.impl.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./internal/Jumpers/MetricPolling.js"
export * from "./MetricPolling.impl.js"

export declare namespace PollingMetric {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MetricPolling.impl.js"
}

/**
 * A `PollingMetric` is a combination of a metric and an effect that polls for
 * updates to the metric.
 *
 * @since 2.0.0
 * @category models
 */
export interface PollingMetric<Type, In, R, E, Out> extends Pipeable {
  readonly [PollingMetricTypeId]: PollingMetricTypeId
  /**
   * The metric that this `PollingMetric` polls to update.
   */
  readonly metric: Metric<Type, In, Out>
  /**
   * An effect that polls a value that may be fed to the metric.
   */
  readonly poll: Effect<R, E, In>
}

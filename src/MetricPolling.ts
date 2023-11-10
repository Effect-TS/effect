/**
 * @since 2.0.0
 */
import type { Effect } from "./Effect.js"
import type { MetricPollingTypeId } from "./impl/MetricPolling.js"
import type { Metric } from "./Metric.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/MetricPolling.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/MetricPolling.js"

/**
 * @since 2.0.0
 */
export declare namespace MetricPolling {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MetricPolling.js"
}

/**
 * A `MetricPolling` is a combination of a metric and an effect that polls for
 * updates to the metric.
 *
 * @since 2.0.0
 * @category models
 */
export interface MetricPolling<Type, In, R, E, Out> extends Pipeable {
  readonly [MetricPollingTypeId]: MetricPollingTypeId
  /**
   * The metric that this `MetricPolling` polls to update.
   */
  readonly metric: Metric<Type, In, Out>
  /**
   * An effect that polls a value that may be fed to the metric.
   */
  readonly poll: Effect<R, E, In>
}

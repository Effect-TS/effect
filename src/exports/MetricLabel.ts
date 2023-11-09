import type { MetricLabelTypeId } from "../MetricLabel.js"
import type { Equal } from "./Equal.js"
import type { Pipeable } from "./Pipeable.js"

export * from "../internal/Jumpers/MetricLabel.js"
export * from "../MetricLabel.js"

export declare namespace MetricLabel {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../MetricLabel.js"
}
/**
 * A `MetricLabel` represents a key value pair that allows analyzing metrics at
 * an additional level of granularity.
 *
 * For example if a metric tracks the response time of a service labels could
 * be used to create separate versions that track response times for different
 * clients.
 *
 * @since 2.0.0
 * @category models
 */
export interface MetricLabel extends Equal, Pipeable {
  readonly [MetricLabelTypeId]: MetricLabelTypeId
  readonly key: string
  readonly value: string
}

// ets_tracing: off

import * as St from "../../Structural"

export const MetricLabelSym = Symbol.for("@effect-ts/core/Metric/MetricLabel")

export type MetricLabelSym = typeof MetricLabelSym

/**
 * A `MetricLabel` represents a key value pair that allows analyzing metrics at
 * an additional level of granularity.
 *
 * For example if a metric tracks the response time of a service labels could
 * be used to create separate versions that track response times for different
 * clients.
 */
export class MetricLabel implements St.HasHash, St.HasEquals {
  readonly [MetricLabelSym] = MetricLabelSym

  constructor(readonly key: string, readonly value: string) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this.key), St.hashString(this.value))
  }

  [St.equalsSym](that: unknown): boolean {
    return isMetricLabel(that) && St.equals(this.value, that)
  }
}

export function isMetricLabel(u: unknown): u is MetricLabel {
  return typeof u === "object" && u != null && MetricLabelSym in u
}

export const MetricLabelSym = Symbol.for("@effect/core/io/Metrics/MetricLabel")
export type MetricLabelSym = typeof MetricLabelSym

/**
 * A `MetricLabel` represents a key value pair that allows analyzing metrics at
 * an additional level of granularity.
 *
 * For example if a metric tracks the response time of a service labels could
 * be used to create separate versions that track response times for different
 * clients.
 *
 * @tsplus type effect/core/io/Metrics/MetricLabel
 * @tsplus companion effect/core/io/Metrics/MetricLabel.Ops
 */
export class MetricLabel implements Equals {
  readonly [MetricLabelSym] = MetricLabelSym

  constructor(readonly key: string, readonly value: string) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this.key), Hash.string(this.value))
  }

  [Equals.sym](that: unknown): boolean {
    return isMetricLabel(that) && this[Hash.sym]() === that[Hash.sym]()
  }
}

/**
 * @tsplus static effect/core/io/Metrics/MetricLabel.Ops __call
 */
export function make(key: string, value: string): MetricLabel {
  return new MetricLabel(key, value)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricLabel.Ops isMetricLabel
 */
export function isMetricLabel(u: unknown): u is MetricLabel {
  return typeof u === "object" && u != null && MetricLabelSym in u
}

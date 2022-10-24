import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const MetricLabelSymbolKey = "@effect/core/io/Metrics/MetricLabel"

/**
 * @category symbol
 * @since 1.0.0
 */
export const MetricLabelSym = Symbol.for(MetricLabelSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
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
 * @category model
 * @since 1.0.0
 */
export class MetricLabel implements Equal.Equal {
  readonly [MetricLabelSym] = MetricLabelSym

  constructor(readonly key: string, readonly value: string) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(MetricLabelSymbolKey),
      Equal.hashCombine(Equal.hash(this.key)),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    return isMetricLabel(that) &&
      this.key === that.key &&
      this.value === that.value
  }
}

/**
 * @tsplus static effect/core/io/Metrics/MetricLabel.Ops __call
 * @category constructors
 * @since 1.0.0
 */
export function make(key: string, value: string): MetricLabel {
  return new MetricLabel(key, value)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricLabel.Ops isMetricLabel
 * @category refinements
 * @since 1.0.0
 */
export function isMetricLabel(u: unknown): u is MetricLabel {
  return typeof u === "object" && u != null && MetricLabelSym in u
}

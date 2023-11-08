import type { Effect } from "./Effect.js"
import type { HashSet } from "./HashSet.js"
import type { MetricTypeId } from "./Metric.impl.js"
import type { MetricKeyType } from "./MetricKeyType.impl.js"
import type { MetricLabel } from "./MetricLabel.impl.js"
import type { MetricState } from "./MetricState.impl.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./internal/Jumpers/Metric.js"
export * from "./Metric.impl.js"

export declare namespace Metric {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Metric.impl.js"
}
/**
 * A `Metric<Type, In, Out>` represents a concurrent metric which accepts
 * updates of type `In` and are aggregated to a stateful value of type `Out`.
 *
 * For example, a counter metric would have type `Metric<number, number>`,
 * representing the fact that the metric can be updated with numbers (the amount
 * to increment or decrement the counter by), and the state of the counter is a
 * number.
 *
 * There are five primitive metric types supported by Effect:
 *
 *   - Counters
 *   - Frequencies
 *   - Gauges
 *   - Histograms
 *   - Summaries
 *
 * @since 2.0.0
 * @category models
 */
export interface Metric<Type, In, Out> extends Metric.Variance<Type, In, Out>, Pipeable {
  /**
   * The type of the underlying primitive metric. For example, this could be
   * `MetricKeyType.Counter` or `MetricKeyType.Gauge`.
   */
  readonly keyType: Type
  readonly unsafeUpdate: (input: In, extraTags: HashSet<MetricLabel>) => void
  readonly unsafeValue: (extraTags: HashSet<MetricLabel>) => Out
  /** */
  <R, E, A extends In>(effect: Effect<R, E, A>): Effect<R, E, A>
}

/**
 * @since 2.0.0
 */
export declare namespace Metric {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Counter<In extends number | bigint>
    extends Metric<MetricKeyType.Counter<In>, In, MetricState.Counter<In>>
  {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Gauge<In extends number | bigint>
    extends Metric<MetricKeyType.Gauge<In>, In, MetricState.Gauge<In>>
  {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Frequency<In> extends Metric<MetricKeyType.Frequency, In, MetricState.Frequency> {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Histogram<In> extends Metric<MetricKeyType.Histogram, In, MetricState.Histogram> {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Summary<In> extends Metric<MetricKeyType.Summary, In, MetricState.Summary> {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Type, In, Out> {
    readonly [MetricTypeId]: {
      readonly _Type: (_: Type) => Type
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }
}

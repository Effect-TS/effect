import type { HistogramBoundaries, HistogramBoundariesOps } from "@effect/core/io/Metrics/Boundaries";

export const MetricSym = Symbol.for("@effect/core/io/Metric");
export type MetricSym = typeof MetricSym;

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
 * @tsplus type ets/Metrics/Metric
 * @tsplus companion ets/Metrics/Metric/Ops
 */
export class Metric<Type, In, Out> {
  readonly [MetricSym]: MetricSym = MetricSym;
  /**
   * The type of the underlying primitive metric. For example, this could be
   * `MetricKeyType.Counter` or `MetricKeyType.Gauge`.
   */
  constructor(
    readonly keyType: Type,
    readonly unsafeUpdate: (input: In, extraTags: HashSet<MetricLabel>) => void,
    readonly unsafeValue: (extraTags: HashSet<MetricLabel>) => Out
  ) {}
}

export declare namespace Metric {
  export interface Counter<In> extends Metric<MetricKeyType.Counter, In, MetricState.Counter> {}
  export interface Gauge<In> extends Metric<MetricKeyType.Gauge, In, MetricState.Gauge> {}
  export interface Frequency<In> extends Metric<MetricKeyType.Frequency, In, MetricState.Frequency> {}
  export interface Histogram<In> extends Metric<MetricKeyType.Histogram, In, MetricState.Histogram> {}
  export interface Summary<In> extends Metric<MetricKeyType.Summary, In, MetricState.Summary> {}

  export namespace Histogram {
    /**
     * @tsplus type ets/Metrics/Histogram/Boundaries
     */
    export type Boundaries = HistogramBoundaries;
  }
}

/**
 * @tsplus static ets/Metrics/Metric/Ops $
 */
export const metricAspects: MetricAspects = {};

/**
 * @tsplus static ets/Metrics/Metric/Ops Histogram
 */
export const histogramBoundaries: { readonly Boundaries: HistogramBoundariesOps; } = { Boundaries: {} };

/**
 * @tsplus type ets/Metrics/Metric/Aspects
 */
export interface MetricAspects {}

import type { HistogramBoundaries, HistogramBoundariesOps } from "@effect/core/io/Metrics/Boundaries"

export const MetricSym = Symbol.for("@effect/core/io/Metric")
export type MetricSym = typeof MetricSym

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
 * @tsplus type effect/core/io/Metrics/Metric
 */
export interface Metric<Type, In, Out> {
  readonly [MetricSym]: MetricSym
  readonly keyType: Type
  readonly unsafeUpdate: (input: In, extraTags: HashSet<MetricLabel>) => void
  readonly unsafeValue: (extraTags: HashSet<MetricLabel>) => Out

  <R, E, A extends In>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A>
}

/**
 * @tsplus type effect/core/io/Metrics/Metric.Ops
 */
export interface MetricOps {
  /**
   * The type of the underlying primitive metric. For example, this could be
   * `MetricKeyType.Counter` or `MetricKeyType.Gauge`.
   */
  <Type, In, Out>(
    keyType: Type,
    unsafeUpdate: (input: In, extraTags: HashSet<MetricLabel>) => void,
    unsafeValue: (extraTags: HashSet<MetricLabel>) => Out
  ): Metric<Type, In, Out>
}

export const Metric: MetricOps = function<Type, In, Out>(
  keyType: Type,
  unsafeUpdate: (input: In, extraTags: HashSet<MetricLabel>) => void,
  unsafeValue: (extraTags: HashSet<MetricLabel>) => Out
): Metric<Type, In, Out> {
  const metric: Metric<Type, In, Out> = Object.assign(
    <R, E, A extends In>(effect: Effect<R, E, A>, __tsplusTrace?: string): Effect<R, E, A> =>
      effect.tap((a) => Effect.sync(unsafeUpdate(a, HashSet.empty()))),
    {
      [MetricSym]: MetricSym,
      keyType,
      unsafeUpdate,
      unsafeValue
    } as const
  )
  return metric
}

export declare namespace Metric {
  export interface Counter<In> extends Metric<MetricKeyType.Counter, In, MetricState.Counter> {}
  export interface Gauge<In> extends Metric<MetricKeyType.Gauge, In, MetricState.Gauge> {}
  export interface Frequency<In> extends Metric<MetricKeyType.Frequency, In, MetricState.Frequency> {}
  export interface Histogram<In> extends Metric<MetricKeyType.Histogram, In, MetricState.Histogram> {}
  export interface Summary<In> extends Metric<MetricKeyType.Summary, In, MetricState.Summary> {}

  export namespace Histogram {
    export type Boundaries = HistogramBoundaries
  }
}

/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops $
 */
export const metricAspects: MetricAspects = {}

/**
 * @tsplus static effect/core/io/Metrics/Metric.Ops Histogram
 */
export const histogramBoundaries: { readonly Boundaries: HistogramBoundariesOps } = { Boundaries: {} }

/**
 * @tsplus type effect/core/io/Metrics/Metric.Aspects
 */
export interface MetricAspects {}

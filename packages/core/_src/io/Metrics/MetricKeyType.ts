export const MetricKeyTypeSym = Symbol.for("@effect/core/io/Metric/MetricKeyType")
export type MetricKeyTypeSym = typeof MetricKeyTypeSym

export const _In = Symbol.for("@effect/core/io/Metric/MetricKeyType/In")
export type _In = typeof _In

export const _Out = Symbol.for("@effect/core/io/Metric/MetricKeyType/Out")
export type _Out = typeof _Out

export const CounterKeySym = Symbol.for("@effect/core/io/Metric/MetricKeyType/Counter")
export type CounterKeySym = typeof CounterKeySym

export const FrequencyKeySym = Symbol.for("@effect/core/io/Metric/MetricKeyType/Frequency")
export type FrequencyKeySym = typeof FrequencyKeySym

export const GaugeKeySym = Symbol.for("@effect/core/io/Metric/MetricKeyType/Gauge")
export type GaugeKeySym = typeof GaugeKeySym

export const HistogramKeySym = Symbol.for("@effect/core/io/Metric/MetricKeyType/Histogram")
export type HistogramKeySym = typeof HistogramKeySym

export const SummaryKeySym = Symbol.for("@effect/core/io/Metric/MetricKeyType/Summary")
export type SummaryKeySym = typeof SummaryKeySym

/**
 * @tsplus type ets/Metrics/MetricKeyType
 */
export interface MetricKeyType<In, Out> extends Equals {
  readonly [MetricKeyTypeSym]: MetricKeyTypeSym
  readonly [_In]: () => In
  readonly [_Out]: () => Out
}

export declare namespace MetricKeyType {
  export type Untyped = MetricKeyType<any, any>

  export type Counter = CounterKey
  export type Gauge = GaugeKey
  export type Frequency = FrequencyKey
  export type Histogram = HistogramKey
  export type Summary = SummaryKey
}

export abstract class BaseMetricKeyType<In, Out> implements MetricKeyType<In, Out> {
  readonly [MetricKeyTypeSym]: MetricKeyTypeSym = MetricKeyTypeSym
  readonly [_In]!: () => In
  readonly [_Out]!: () => Out

  abstract [Hash.sym](): number
  abstract [Equals.sym](u: unknown): boolean
}

export class CounterKey extends BaseMetricKeyType<number, MetricState.Counter> {
  readonly [CounterKeySym]: CounterKeySym = CounterKeySym;

  [Hash.sym](): number {
    return Hash.string("ets/Metrics/MetricKeyType/Counter")
  }

  [Equals.sym](u: unknown): boolean {
    return isCounterKey(u)
  }
}

export class GaugeKey extends BaseMetricKeyType<number, MetricState.Gauge> {
  readonly [GaugeKeySym]: GaugeKeySym = GaugeKeySym;

  [Hash.sym](): number {
    return Hash.string("ets/Metrics/MetricKeyType/Gauge")
  }

  [Equals.sym](u: unknown): boolean {
    return isGaugeKey(u)
  }
}

export class FrequencyKey extends BaseMetricKeyType<string, MetricState.Frequency> {
  readonly [FrequencyKeySym]: FrequencyKeySym = FrequencyKeySym;

  [Hash.sym](): number {
    return Hash.string("ets/Metrics/MetricKeyType/Frequency")
  }

  [Equals.sym](u: unknown): boolean {
    return isFrequencyKey(u)
  }
}

export class HistogramKey extends BaseMetricKeyType<number, MetricState.Histogram> {
  readonly [HistogramKeySym]: HistogramKeySym = HistogramKeySym

  constructor(readonly boundaries: Metric.Histogram.Boundaries) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("ets/Metrics/MetricKeyType/Histogram"),
      Hash.unknown(this.boundaries)
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isHistogramKey(u) && this.boundaries == u.boundaries
  }
}

export class SummaryKey extends BaseMetricKeyType<Tuple<[number, number]>, MetricState.Summary> {
  readonly [SummaryKeySym]: SummaryKeySym = SummaryKeySym

  constructor(
    readonly maxAge: Duration,
    readonly maxSize: number,
    readonly error: number,
    readonly quantiles: Chunk<number>
  ) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("ets/Metrics/MetricKeyType/Summary"),
      Hash.combine(
        Hash.unknown(this.maxAge),
        Hash.combine(
          Hash.number(this.maxSize),
          Hash.combine(Hash.number(this.error), Hash.unknown(this.quantiles))
        )
      )
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isSummaryKey(u) &&
      this.maxAge == u.maxAge &&
      this.maxSize === u.maxSize &&
      this.error === u.error &&
      this.quantiles == u.quantiles
  }
}

/**
 * @tsplus type ets/Metrics/MetricKeyType/Ops
 */
export interface MetricKeyTypeOps {}
export const MetricKeyType: MetricKeyTypeOps = {}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops Counter
 */
export const counter: MetricKeyType.Counter = new CounterKey()

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops Frequency
 */
export const frequency: MetricKeyType.Frequency = new FrequencyKey()

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops Gauge
 */
export const gauge: MetricKeyType.Gauge = new GaugeKey()

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops Histogram
 */
export function histogram(boundaries: Metric.Histogram.Boundaries): MetricKeyType.Histogram {
  return new HistogramKey(boundaries)
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops Summary
 */
export function summary(
  maxAge: Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk<number>
): MetricKeyType.Summary {
  return new SummaryKey(maxAge, maxSize, error, quantiles)
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops isMetricKeyType
 */
export function isMetricKeyType(u: unknown): u is MetricKeyType<unknown, unknown> {
  return typeof u === "object" && u != null && MetricKeyTypeSym in u
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops isCounterKey
 */
export function isCounterKey(u: unknown): u is CounterKey {
  return typeof u === "object" && u != null && CounterKeySym in u
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops isGaugeKey
 */
export function isGaugeKey(u: unknown): u is GaugeKey {
  return typeof u === "object" && u != null && GaugeKeySym in u
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops isFrequencyKey
 */
export function isFrequencyKey(u: unknown): u is FrequencyKey {
  return typeof u === "object" && u != null && FrequencyKeySym in u
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops isHistogramKey
 */
export function isHistogramKey(u: unknown): u is HistogramKey {
  return typeof u === "object" && u != null && HistogramKeySym in u
}

/**
 * @tsplus static ets/Metrics/MetricKeyType/Ops isSummaryKey
 */
export function isSummaryKey(u: unknown): u is SummaryKey {
  return typeof u === "object" && u != null && SummaryKeySym in u
}

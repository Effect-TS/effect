import type { Chunk } from "@fp-ts/data/Chunk"
import type { Duration } from "@fp-ts/data/Duration"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

/**
 * @category symbol
 * @since 1.0.0
 */
export const MetricKeyTypeSym = Symbol.for("@effect/core/io/Metric/MetricKeyType")

/**
 * @category symbol
 * @since 1.0.0
 */
export type MetricKeyTypeSym = typeof MetricKeyTypeSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _In = Symbol.for("@effect/core/io/Metric/MetricKeyType/In")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _In = typeof _In

/**
 * @category symbol
 * @since 1.0.0
 */
export const _Out = Symbol.for("@effect/core/io/Metric/MetricKeyType/Out")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _Out = typeof _Out

const CounterKeySymbolKey = "effect/core/io/Metrics/MetricKeyType/Counter"
const FrequencyKeySymbolKey = "@effect/core/io/Metric/MetricKeyType/Frequency"
const GaugeKeySymbolKey = "effect/core/io/Metrics/MetricKeyType/Gauge"
const HistogramKeySymbolKey = "effect/core/io/Metrics/MetricKeyType/Histogram"
const SummaryKeySymbolKey = "@effect/core/io/Metric/MetricKeyType/Summary"

/**
 * @category symbol
 * @since 1.0.0
 */
export const CounterKeySym = Symbol.for(CounterKeySymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type CounterKeySym = typeof CounterKeySym

/**
 * @category symbol
 * @since 1.0.0
 */
export const FrequencyKeySym = Symbol.for(FrequencyKeySymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type FrequencyKeySym = typeof FrequencyKeySym

/**
 * @category symbol
 * @since 1.0.0
 */
export const GaugeKeySym = Symbol.for(GaugeKeySymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type GaugeKeySym = typeof GaugeKeySym

/**
 * @category symbol
 * @since 1.0.0
 */
export const HistogramKeySym = Symbol.for(HistogramKeySymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type HistogramKeySym = typeof HistogramKeySym

/**
 * @category symbol
 * @since 1.0.0
 */
export const SummaryKeySym = Symbol.for(SummaryKeySymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type SummaryKeySym = typeof SummaryKeySym

/**
 * @tsplus type effect/core/io/Metrics/MetricKeyType
 * @category model
 * @since 1.0.0
 */
export interface MetricKeyType<In, Out> extends Equal.Equal {
  readonly [MetricKeyTypeSym]: MetricKeyTypeSym
  readonly [_In]: () => In
  readonly [_Out]: () => Out
}

/**
 * @since 1.0.0
 */
export declare namespace MetricKeyType {
  export type Untyped = MetricKeyType<any, any>

  export type Counter = CounterKey
  export type Gauge = GaugeKey
  export type Frequency = FrequencyKey
  export type Histogram = HistogramKey
  export type Summary = SummaryKey
}

/** @internal */
export abstract class BaseMetricKeyType<In, Out> implements MetricKeyType<In, Out> {
  readonly [MetricKeyTypeSym]: MetricKeyTypeSym = MetricKeyTypeSym
  readonly [_In]!: () => In
  readonly [_Out]!: () => Out

  abstract [Equal.symbolHash](): number
  abstract [Equal.symbolEqual](u: unknown): boolean
}

/**
 * @category model
 * @since 1.0.0
 */
export class CounterKey extends BaseMetricKeyType<number, MetricState.Counter> {
  readonly [CounterKeySym]: CounterKeySym = CounterKeySym;

  [Equal.symbolHash](): number {
    return Equal.hash(CounterKeySymbolKey)
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isCounterKey(u)
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class GaugeKey extends BaseMetricKeyType<number, MetricState.Gauge> {
  readonly [GaugeKeySym]: GaugeKeySym = GaugeKeySym;

  [Equal.symbolHash](): number {
    return Equal.hash(GaugeKeySymbolKey)
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isGaugeKey(u)
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class FrequencyKey extends BaseMetricKeyType<string, MetricState.Frequency> {
  readonly [FrequencyKeySym]: FrequencyKeySym = FrequencyKeySym;

  [Equal.symbolHash](): number {
    return Equal.hash(FrequencyKeySymbolKey)
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isFrequencyKey(u)
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class HistogramKey extends BaseMetricKeyType<number, MetricState.Histogram> {
  readonly [HistogramKeySym]: HistogramKeySym = HistogramKeySym

  constructor(readonly boundaries: Metric.Histogram.Boundaries) {
    super()
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(HistogramKeySymbolKey),
      Equal.hashCombine(Equal.hash(this.boundaries))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isHistogramKey(u) && Equal.equals(this.boundaries, u.boundaries)
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class SummaryKey extends BaseMetricKeyType<readonly [number, number], MetricState.Summary> {
  readonly [SummaryKeySym]: SummaryKeySym = SummaryKeySym

  constructor(
    readonly maxAge: Duration,
    readonly maxSize: number,
    readonly error: number,
    readonly quantiles: Chunk<number>
  ) {
    super()
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(SummaryKeySymbolKey),
      Equal.hashCombine(Equal.hash(this.maxAge)),
      Equal.hashCombine(Equal.hash(this.maxSize)),
      Equal.hashCombine(Equal.hash(this.error)),
      Equal.hashCombine(Equal.hash(this.quantiles))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isSummaryKey(u) &&
      Equal.equals(this.maxAge, u.maxAge) &&
      this.maxSize === u.maxSize &&
      this.error === u.error &&
      Equal.equals(this.quantiles, u.quantiles)
  }
}

/**
 * @tsplus type effect/core/io/Metrics/MetricKeyType.Ops
 * @category model
 * @since 1.0.0
 */
export interface MetricKeyTypeOps {}
export const MetricKeyType: MetricKeyTypeOps = {}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops Counter
 * @category constructors
 * @since 1.0.0
 */
export const counter: MetricKeyType.Counter = new CounterKey()

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops Frequency
 * @category constructors
 * @since 1.0.0
 */
export const frequency: MetricKeyType.Frequency = new FrequencyKey()

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops Gauge
 * @category constructors
 * @since 1.0.0
 */
export const gauge: MetricKeyType.Gauge = new GaugeKey()

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops Histogram
 * @category constructors
 * @since 1.0.0
 */
export function histogram(boundaries: Metric.Histogram.Boundaries): MetricKeyType.Histogram {
  return new HistogramKey(boundaries)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops Summary
 * @category constructors
 * @since 1.0.0
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
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops isMetricKeyType
 * @category refinements
 * @since 1.0.0
 */
export function isMetricKeyType(u: unknown): u is MetricKeyType<unknown, unknown> {
  return typeof u === "object" && u != null && MetricKeyTypeSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops isCounterKey
 * @category refinements
 * @since 1.0.0
 */
export function isCounterKey(u: unknown): u is CounterKey {
  return typeof u === "object" && u != null && CounterKeySym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops isGaugeKey
 * @category refinements
 * @since 1.0.0
 */
export function isGaugeKey(u: unknown): u is GaugeKey {
  return typeof u === "object" && u != null && GaugeKeySym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops isFrequencyKey
 * @category refinements
 * @since 1.0.0
 */
export function isFrequencyKey(u: unknown): u is FrequencyKey {
  return typeof u === "object" && u != null && FrequencyKeySym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops isHistogramKey
 * @category refinements
 * @since 1.0.0
 */
export function isHistogramKey(u: unknown): u is HistogramKey {
  return typeof u === "object" && u != null && HistogramKeySym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricKeyType.Ops isSummaryKey
 * @category refinements
 * @since 1.0.0
 */
export function isSummaryKey(u: unknown): u is SummaryKey {
  return typeof u === "object" && u != null && SummaryKeySym in u
}

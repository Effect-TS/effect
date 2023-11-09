import type * as Chunk from "../../Chunk.js"
import * as Duration from "../../Duration.js"
import * as Equal from "../../Equal.js"
import { pipe } from "../../Function.js"
import * as Hash from "../../Hash.js"
import type * as MetricBoundaries from "../../MetricBoundaries.js"
import type * as MetricKeyType from "../../MetricKeyType.js"
import { pipeArguments } from "../../Pipeable.js"
import { hasProperty } from "../../Predicate.js"

/** @internal */
const MetricKeyTypeSymbolKey = "effect/MetricKeyType"

/** @internal */
export const MetricKeyTypeTypeId: MetricKeyType.MetricKeyTypeTypeId = Symbol.for(
  MetricKeyTypeSymbolKey
) as MetricKeyType.MetricKeyTypeTypeId

/** @internal */
const CounterKeyTypeSymbolKey = "effect/MetricKeyType/Counter"

/** @internal */
export const CounterKeyTypeTypeId: MetricKeyType.CounterKeyTypeTypeId = Symbol.for(
  CounterKeyTypeSymbolKey
) as MetricKeyType.CounterKeyTypeTypeId

/** @internal */
const FrequencyKeyTypeSymbolKey = "effect/MetricKeyType/Frequency"

/** @internal */
export const FrequencyKeyTypeTypeId: MetricKeyType.FrequencyKeyTypeTypeId = Symbol.for(
  FrequencyKeyTypeSymbolKey
) as MetricKeyType.FrequencyKeyTypeTypeId

/** @internal */
const GaugeKeyTypeSymbolKey = "effect/MetricKeyType/Gauge"

/** @internal */
export const GaugeKeyTypeTypeId: MetricKeyType.GaugeKeyTypeTypeId = Symbol.for(
  GaugeKeyTypeSymbolKey
) as MetricKeyType.GaugeKeyTypeTypeId

/** @internal */
const HistogramKeyTypeSymbolKey = "effect/MetricKeyType/Histogram"

/** @internal */
export const HistogramKeyTypeTypeId: MetricKeyType.HistogramKeyTypeTypeId = Symbol.for(
  HistogramKeyTypeSymbolKey
) as MetricKeyType.HistogramKeyTypeTypeId

/** @internal */
const SummaryKeyTypeSymbolKey = "effect/MetricKeyType/Summary"

/** @internal */
export const SummaryKeyTypeTypeId: MetricKeyType.SummaryKeyTypeTypeId = Symbol.for(
  SummaryKeyTypeSymbolKey
) as MetricKeyType.SummaryKeyTypeTypeId

/** @internal */
const metricKeyTypeVariance = {
  _In: (_: unknown) => _,
  _Out: (_: never) => _
}

/** @internal */
class CounterKeyType<A extends (number | bigint)> implements MetricKeyType.MetricKeyType.Counter<A> {
  readonly [MetricKeyTypeTypeId] = metricKeyTypeVariance
  readonly [CounterKeyTypeTypeId]: MetricKeyType.CounterKeyTypeTypeId = CounterKeyTypeTypeId
  constructor(readonly incremental: boolean, readonly bigint: boolean) {}
  [Hash.symbol](): number {
    return Hash.hash(CounterKeyTypeSymbolKey)
  }
  [Equal.symbol](that: unknown): boolean {
    return isCounterKey(that)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
class FrequencyKeyType implements MetricKeyType.MetricKeyType.Frequency {
  readonly [MetricKeyTypeTypeId] = metricKeyTypeVariance
  readonly [FrequencyKeyTypeTypeId]: MetricKeyType.FrequencyKeyTypeTypeId = FrequencyKeyTypeTypeId;
  [Hash.symbol](): number {
    return Hash.hash(FrequencyKeyTypeSymbolKey)
  }
  [Equal.symbol](that: unknown): boolean {
    return isFrequencyKey(that)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
class GaugeKeyType<A extends (number | bigint)> implements MetricKeyType.MetricKeyType.Gauge<A> {
  readonly [MetricKeyTypeTypeId] = metricKeyTypeVariance
  readonly [GaugeKeyTypeTypeId]: MetricKeyType.GaugeKeyTypeTypeId = GaugeKeyTypeTypeId
  constructor(readonly bigint: boolean) {}
  [Hash.symbol](): number {
    return Hash.hash(GaugeKeyTypeSymbolKey)
  }
  [Equal.symbol](that: unknown): boolean {
    return isGaugeKey(that)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @category model
 * @since 2.0.0
 */
export class HistogramKeyType implements MetricKeyType.MetricKeyType.Histogram {
  readonly [MetricKeyTypeTypeId] = metricKeyTypeVariance
  readonly [HistogramKeyTypeTypeId]: MetricKeyType.HistogramKeyTypeTypeId = HistogramKeyTypeTypeId
  constructor(readonly boundaries: MetricBoundaries.MetricBoundaries) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(HistogramKeyTypeSymbolKey),
      Hash.combine(Hash.hash(this.boundaries))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isHistogramKey(that) && Equal.equals(this.boundaries, that.boundaries)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
class SummaryKeyType implements MetricKeyType.MetricKeyType.Summary {
  readonly [MetricKeyTypeTypeId] = metricKeyTypeVariance
  readonly [SummaryKeyTypeTypeId]: MetricKeyType.SummaryKeyTypeTypeId = SummaryKeyTypeTypeId
  constructor(
    readonly maxAge: Duration.Duration,
    readonly maxSize: number,
    readonly error: number,
    readonly quantiles: Chunk.Chunk<number>
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(SummaryKeyTypeSymbolKey),
      Hash.combine(Hash.hash(this.maxAge)),
      Hash.combine(Hash.hash(this.maxSize)),
      Hash.combine(Hash.hash(this.error)),
      Hash.combine(Hash.hash(this.quantiles))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isSummaryKey(that) &&
      Equal.equals(this.maxAge, that.maxAge) &&
      this.maxSize === that.maxSize &&
      this.error === that.error &&
      Equal.equals(this.quantiles, that.quantiles)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const counter: <A extends number | bigint>(options?: {
  readonly bigint: boolean
  readonly incremental: boolean
}) => CounterKeyType<A> = (options) =>
  new CounterKeyType(
    options?.incremental ?? false,
    options?.bigint ?? false
  )

/**
 * @since 2.0.0
 * @category constructors
 */
export const frequency: MetricKeyType.MetricKeyType.Frequency = new FrequencyKeyType()

/**
 * @since 2.0.0
 * @category constructors
 */
export const gauge: <A extends number | bigint>(options?: {
  readonly bigint: boolean
}) => GaugeKeyType<A> = (options) =>
  new GaugeKeyType(
    options?.bigint ?? false
  )

/**
 * @since 2.0.0
 * @category constructors
 */
export const histogram = (boundaries: MetricBoundaries.MetricBoundaries): MetricKeyType.MetricKeyType.Histogram => {
  return new HistogramKeyType(boundaries)
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const summary = (
  options: {
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk.Chunk<number>
  }
): MetricKeyType.MetricKeyType.Summary => {
  return new SummaryKeyType(Duration.decode(options.maxAge), options.maxSize, options.error, options.quantiles)
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricKeyType = (u: unknown): u is MetricKeyType.MetricKeyType<unknown, unknown> =>
  hasProperty(u, MetricKeyTypeTypeId)

/**
 * @since 2.0.0
 * @category refinements
 */
export const isCounterKey = (u: unknown): u is MetricKeyType.MetricKeyType.Counter<number | bigint> =>
  hasProperty(u, CounterKeyTypeTypeId)

/**
 * @since 2.0.0
 * @category refinements
 */
export const isFrequencyKey = (u: unknown): u is MetricKeyType.MetricKeyType.Frequency =>
  hasProperty(u, FrequencyKeyTypeTypeId)

/**
 * @since 2.0.0
 * @category refinements
 */
export const isGaugeKey = (u: unknown): u is MetricKeyType.MetricKeyType.Gauge<number | bigint> =>
  hasProperty(u, GaugeKeyTypeTypeId)

/**
 * @since 2.0.0
 * @category refinements
 */
export const isHistogramKey = (u: unknown): u is MetricKeyType.MetricKeyType.Histogram =>
  hasProperty(u, HistogramKeyTypeTypeId)

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSummaryKey = (u: unknown): u is MetricKeyType.MetricKeyType.Summary =>
  hasProperty(u, SummaryKeyTypeTypeId)

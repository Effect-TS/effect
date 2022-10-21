export const MetricStateSym = Symbol.for("@effect/core/io/Metrics/MetricState")
export type MetricStateSym = typeof MetricStateSym

export const _Type = Symbol.for("@effect/core/io/Metrics/MetricState/Type")
export type _Type = typeof _Type

export const CounterStateSym = Symbol.for("@effect/core/io/Metrics/MetricState/Counter")
export type CounterStateSym = typeof CounterStateSym

export const GaugeStateSym = Symbol.for("@effect/core/io/Metrics/MetricState/Gauge")
export type GaugeStateSym = typeof GaugeStateSym

export const FrequencyStateSym = Symbol.for("@effect/core/io/Metrics/MetricState/Frequency")
export type FrequencyStateSym = typeof FrequencyStateSym

export const HistogramStateSym = Symbol.for("@effect/core/io/Metrics/MetricState/Histogram")
export type HistogramStateSym = typeof HistogramStateSym

export const SummaryStateSym = Symbol.for("@effect/core/io/Metrics/MetricState/Summary")
export type SummaryStateSym = typeof SummaryStateSym

/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricKeyType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @tsplus type effect/core/io/Metrics/MetricState
 */
export interface MetricState<Type> extends Equals {
  readonly [MetricStateSym]: MetricStateSym
  readonly [_Type]: (_: Type) => void
}

export declare namespace MetricState {
  export type Untyped = MetricState<any>

  export type Counter = CounterState
  export type Frequency = FrequencyState
  export type Gauge = GaugeState
  export type Histogram = HistogramState
  export type Summary = SummaryState
}

/**
 * @tsplus type effect/core/io/Metrics/MetricState.Ops
 */
export interface MetricStateOps {}
export const MetricState: MetricStateOps = {}

export abstract class BaseMetricState<Type> implements MetricState<Type> {
  readonly [MetricStateSym]: MetricStateSym = MetricStateSym
  readonly [_Type]!: (_: Type) => void

  abstract [Hash.sym](): number
  abstract [Equals.sym](u: unknown): boolean
}

export class CounterState extends BaseMetricState<MetricKeyType.Counter> {
  readonly [CounterStateSym]: CounterStateSym = CounterStateSym

  constructor(readonly count: number) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("@effect/core/io/Metrics/MetricState/Counter"),
      Hash.number(this.count)
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isCounterState(u) && this.count === u.count
  }
}

export class GaugeState extends BaseMetricState<MetricKeyType.Gauge> {
  readonly [GaugeStateSym]: GaugeStateSym = GaugeStateSym

  constructor(readonly value: number) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("@effect/core/io/Metrics/MetricState/Gauge"),
      Hash.number(this.value)
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isGaugeState(u) && this.value === u.value
  }
}

export class FrequencyState extends BaseMetricState<MetricKeyType.Frequency> {
  readonly [FrequencyStateSym]: FrequencyStateSym = FrequencyStateSym

  constructor(readonly occurrences: HashMap<string, number>) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("@effect/core/io/Metrics/MetricState/Frequency"),
      Hash.iterator(this.occurrences[Symbol.iterator]())
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isFrequencyState(u) && this.occurrences == u.occurrences
  }
}

export class HistogramState extends BaseMetricState<MetricKeyType.Histogram> {
  readonly [HistogramStateSym]: HistogramStateSym = HistogramStateSym

  constructor(
    readonly buckets: Chunk<readonly [number, number]>,
    readonly count: number,
    readonly min: number,
    readonly max: number,
    readonly sum: number
  ) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("@effect/core/io/Metrics/MetricState/Histogram"),
      Hash.combine(
        Hash.unknown(this.buckets),
        Hash.combine(
          Hash.number(this.count),
          Hash.combine(
            Hash.number(this.min),
            Hash.combine(Hash.number(this.max), Hash.number(this.sum))
          )
        )
      )
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isHistogramState(u) &&
      this.buckets == u.buckets &&
      this.count === u.count &&
      this.min === u.min &&
      this.max === u.max &&
      this.sum === u.sum
  }
}

export class SummaryState extends BaseMetricState<MetricKeyType.Summary> {
  readonly [SummaryStateSym]: SummaryStateSym = SummaryStateSym

  constructor(
    readonly error: number,
    readonly quantiles: Chunk<readonly [number, Maybe<number>]>,
    readonly count: number,
    readonly min: number,
    readonly max: number,
    readonly sum: number
  ) {
    super()
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("@effect/core/io/Metrics/MetricState/Summary"),
      Hash.combine(
        Hash.number(this.error),
        Hash.combine(
          Hash.unknown(this.quantiles),
          Hash.combine(
            Hash.number(this.count),
            Hash.combine(
              Hash.number(this.min),
              Hash.combine(Hash.number(this.max), Hash.number(this.sum))
            )
          )
        )
      )
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isSummaryState(u) &&
      this.error === u.error &&
      this.quantiles == u.quantiles &&
      this.count === u.count &&
      this.min === u.min &&
      this.max === u.max &&
      this.sum === u.sum
  }
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Counter
 */
export function counter(count: number): MetricState.Counter {
  return new CounterState(count)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Gauge
 */
export function gauge(value: number): MetricState.Gauge {
  return new GaugeState(value)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Frequency
 */
export function frequency(occurrences: HashMap<string, number>): MetricState.Frequency {
  return new FrequencyState(occurrences)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Histogram
 */
export function histogram(
  buckets: Chunk<readonly [number, number]>,
  count: number,
  min: number,
  max: number,
  sum: number
): MetricState.Histogram {
  return new HistogramState(buckets, count, min, max, sum)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Summary
 */
export function summary(
  error: number,
  quantiles: Chunk<readonly [number, Maybe<number>]>,
  count: number,
  min: number,
  max: number,
  sum: number
): MetricState.Summary {
  return new SummaryState(error, quantiles, count, min, max, sum)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isCounterState
 */
export function isCounterState(u: unknown): u is MetricState.Counter {
  return typeof u === "object" && u != null && CounterStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isGaugeState
 */
export function isGaugeState(u: unknown): u is MetricState.Gauge {
  return typeof u === "object" && u != null && GaugeStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isFrequencyState
 */
export function isFrequencyState(u: unknown): u is MetricState.Frequency {
  return typeof u === "object" && u != null && FrequencyStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isHistogramState
 */
export function isHistogramState(u: unknown): u is MetricState.Histogram {
  return typeof u === "object" && u != null && HistogramStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isSummaryState
 */
export function isSummaryState(u: unknown): u is MetricState.Summary {
  return typeof u === "object" && u != null && SummaryStateSym in u
}

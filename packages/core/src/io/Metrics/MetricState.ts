import type { Chunk } from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import type { HashMap } from "@fp-ts/data/HashMap"
import type { Option } from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const MetricStateSym = Symbol.for("@effect/core/io/Metrics/MetricState")

/**
 * @category symbol
 * @since 1.0.0
 */
export type MetricStateSym = typeof MetricStateSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _Type = Symbol.for("@effect/core/io/Metrics/MetricState/Type")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _Type = typeof _Type

const CounterStateSymbolKey = "@effect/core/io/Metrics/MetricState/Counter"
const GaugeStateSymbolKey = "@effect/core/io/Metrics/MetricState/Gauge"
const FrequencyStateSymbolKey = "@effect/core/io/Metrics/MetricState/Frequency"
const HistogramStateSymbolKey = "@effect/core/io/Metrics/MetricState/Histogram"
const SummaryStateSymbolKey = "@effect/core/io/Metrics/MetricState/Summary"

/**
 * @category symbol
 * @since 1.0.0
 */
export const CounterStateSym = Symbol.for(CounterStateSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type CounterStateSym = typeof CounterStateSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const GaugeStateSym = Symbol.for(GaugeStateSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type GaugeStateSym = typeof GaugeStateSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const FrequencyStateSym = Symbol.for(FrequencyStateSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type FrequencyStateSym = typeof FrequencyStateSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const HistogramStateSym = Symbol.for(HistogramStateSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type HistogramStateSym = typeof HistogramStateSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const SummaryStateSym = Symbol.for(SummaryStateSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type SummaryStateSym = typeof SummaryStateSym

/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricKeyType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @tsplus type effect/core/io/Metrics/MetricState
 * @category model
 * @since 1.0.0
 */
export interface MetricState<Type> extends Equal.Equal {
  readonly [MetricStateSym]: MetricStateSym
  readonly [_Type]: (_: Type) => void
}

/**
 * @since 1.0.0
 */
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

/** @internal */
export abstract class BaseMetricState<Type> implements MetricState<Type> {
  readonly [MetricStateSym]: MetricStateSym = MetricStateSym
  readonly [_Type]!: (_: Type) => void

  abstract [Equal.symbolEqual](that: unknown): boolean
  abstract [Equal.symbolHash](): number
}

/**
 * @category model
 * @since 1.0.0
 */
export class CounterState extends BaseMetricState<MetricKeyType.Counter> {
  readonly [CounterStateSym]: CounterStateSym = CounterStateSym

  constructor(readonly count: number) {
    super()
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(CounterStateSymbolKey),
      Equal.hashCombine(Equal.hash(this.count))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isCounterState(u) && this.count === u.count
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class GaugeState extends BaseMetricState<MetricKeyType.Gauge> {
  readonly [GaugeStateSym]: GaugeStateSym = GaugeStateSym

  constructor(readonly value: number) {
    super()
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(GaugeStateSymbolKey),
      Equal.hashCombine(Equal.hash(this.value))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isGaugeState(u) && this.value === u.value
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class FrequencyState extends BaseMetricState<MetricKeyType.Frequency> {
  readonly [FrequencyStateSym]: FrequencyStateSym = FrequencyStateSym

  constructor(readonly occurrences: HashMap<string, number>) {
    super()
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(FrequencyStateSymbolKey),
      Equal.hashCombine(Equal.hash(this.occurrences))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isFrequencyState(u) && Equal.equals(this.occurrences, u.occurrences)
  }
}

/**
 * @category model
 * @since 1.0.0
 */
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

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(HistogramStateSymbolKey),
      Equal.hashCombine(Equal.hash(this.buckets)),
      Equal.hashCombine(Equal.hash(this.count)),
      Equal.hashCombine(Equal.hash(this.min)),
      Equal.hashCombine(Equal.hash(this.max)),
      Equal.hashCombine(Equal.hash(this.sum))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isHistogramState(u) &&
      Equal.equals(this.buckets, u.buckets) &&
      this.count === u.count &&
      this.min === u.min &&
      this.max === u.max &&
      this.sum === u.sum
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class SummaryState extends BaseMetricState<MetricKeyType.Summary> {
  readonly [SummaryStateSym]: SummaryStateSym = SummaryStateSym

  constructor(
    readonly error: number,
    readonly quantiles: Chunk<readonly [number, Option<number>]>,
    readonly count: number,
    readonly min: number,
    readonly max: number,
    readonly sum: number
  ) {
    super()
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(SummaryStateSymbolKey),
      Equal.hashCombine(Equal.hash(this.error)),
      Equal.hashCombine(Equal.hash(this.quantiles)),
      Equal.hashCombine(Equal.hash(this.count)),
      Equal.hashCombine(Equal.hash(this.min)),
      Equal.hashCombine(Equal.hash(this.max)),
      Equal.hashCombine(Equal.hash(this.sum))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isSummaryState(u) &&
      this.error === u.error &&
      Equal.equals(this.quantiles, u.quantiles) &&
      this.count === u.count &&
      this.min === u.min &&
      this.max === u.max &&
      this.sum === u.sum
  }
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Counter
 * @category constructors
 * @since 1.0.0
 */
export function counter(count: number): MetricState.Counter {
  return new CounterState(count)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Gauge
 * @category constructors
 * @since 1.0.0
 */
export function gauge(value: number): MetricState.Gauge {
  return new GaugeState(value)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Frequency
 * @category constructors
 * @since 1.0.0
 */
export function frequency(occurrences: HashMap<string, number>): MetricState.Frequency {
  return new FrequencyState(occurrences)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops Histogram
 * @category constructors
 * @since 1.0.0
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
 * @category constructors
 * @since 1.0.0
 */
export function summary(
  error: number,
  quantiles: Chunk<readonly [number, Option<number>]>,
  count: number,
  min: number,
  max: number,
  sum: number
): MetricState.Summary {
  return new SummaryState(error, quantiles, count, min, max, sum)
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isCounterState
 * @category refinements
 * @since 1.0.0
 */
export function isCounterState(u: unknown): u is MetricState.Counter {
  return typeof u === "object" && u != null && CounterStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isGaugeState
 * @category refinements
 * @since 1.0.0
 */
export function isGaugeState(u: unknown): u is MetricState.Gauge {
  return typeof u === "object" && u != null && GaugeStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isFrequencyState
 * @category refinements
 * @since 1.0.0
 */
export function isFrequencyState(u: unknown): u is MetricState.Frequency {
  return typeof u === "object" && u != null && FrequencyStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isHistogramState
 * @category refinements
 * @since 1.0.0
 */
export function isHistogramState(u: unknown): u is MetricState.Histogram {
  return typeof u === "object" && u != null && HistogramStateSym in u
}

/**
 * @tsplus static effect/core/io/Metrics/MetricState.Ops isSummaryState
 * @category refinements
 * @since 1.0.0
 */
export function isSummaryState(u: unknown): u is MetricState.Summary {
  return typeof u === "object" && u != null && SummaryStateSym in u
}

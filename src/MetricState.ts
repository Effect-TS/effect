/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk"
import type * as Equal from "./Equal"
import type * as HashMap from "./HashMap"
import * as internal from "./internal/metric/state"
import type * as MetricKeyType from "./MetricKeyType"
import type * as Option from "./Option"
import type { Pipeable } from "./Pipeable"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricStateTypeId: unique symbol = internal.MetricStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricStateTypeId = typeof MetricStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const CounterStateTypeId: unique symbol = internal.CounterStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type CounterStateTypeId = typeof CounterStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const FrequencyStateTypeId: unique symbol = internal.FrequencyStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type FrequencyStateTypeId = typeof FrequencyStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const GaugeStateTypeId: unique symbol = internal.GaugeStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type GaugeStateTypeId = typeof GaugeStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const HistogramStateTypeId: unique symbol = internal.HistogramStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type HistogramStateTypeId = typeof HistogramStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const SummaryStateTypeId: unique symbol = internal.SummaryStateTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SummaryStateTypeId = typeof SummaryStateTypeId

/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricStateType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @since 2.0.0
 * @category models
 */
export interface MetricState<A> extends MetricState.Variance<A>, Equal.Equal, Pipeable {}

/**
 * @since 2.0.0
 */
export declare namespace MetricState {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Untyped extends MetricState<any> {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Counter<A extends (number | bigint)> extends MetricState<MetricKeyType.MetricKeyType.Counter<A>> {
    readonly [CounterStateTypeId]: CounterStateTypeId
    readonly count: A
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Frequency extends MetricState<MetricKeyType.MetricKeyType.Frequency> {
    readonly [FrequencyStateTypeId]: FrequencyStateTypeId
    readonly occurrences: HashMap.HashMap<string, number>
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Gauge<A extends (number | bigint)> extends MetricState<MetricKeyType.MetricKeyType.Gauge<A>> {
    readonly [GaugeStateTypeId]: GaugeStateTypeId
    readonly value: A
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Histogram extends MetricState<MetricKeyType.MetricKeyType.Histogram> {
    readonly [HistogramStateTypeId]: HistogramStateTypeId
    readonly buckets: Chunk.Chunk<readonly [number, number]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Summary extends MetricState<MetricKeyType.MetricKeyType.Summary> {
    readonly [SummaryStateTypeId]: SummaryStateTypeId
    readonly error: number
    readonly quantiles: Chunk.Chunk<readonly [number, Option.Option<number>]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [MetricStateTypeId]: {
      readonly _A: (_: A) => void
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const counter: {
  (count: number): MetricState.Counter<number>
  (count: bigint): MetricState.Counter<bigint>
} = internal.counter

/**
 * @since 2.0.0
 * @category constructors
 */
export const frequency: (occurrences: HashMap.HashMap<string, number>) => MetricState.Frequency = internal.frequency

/**
 * @since 2.0.0
 * @category constructors
 */
export const gauge: {
  (count: number): MetricState.Gauge<number>
  (count: bigint): MetricState.Gauge<bigint>
} = internal.gauge

/**
 * @since 2.0.0
 * @category constructors
 */
export const histogram: (
  options: {
    readonly buckets: Chunk.Chunk<readonly [number, number]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }
) => MetricState.Histogram = internal.histogram

/**
 * @since 2.0.0
 * @category constructors
 */
export const summary: (
  options: {
    readonly error: number
    readonly quantiles: Chunk.Chunk<readonly [number, Option.Option<number>]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }
) => MetricState.Summary = internal.summary

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricState: (u: unknown) => u is MetricState.Counter<number | bigint> = internal.isMetricState

/**
 * @since 2.0.0
 * @category refinements
 */
export const isCounterState: (u: unknown) => u is MetricState.Counter<number | bigint> = internal.isCounterState

/**
 * @since 2.0.0
 * @category refinements
 */
export const isFrequencyState: (u: unknown) => u is MetricState.Frequency = internal.isFrequencyState

/**
 * @since 2.0.0
 * @category refinements
 */
export const isGaugeState: (u: unknown) => u is MetricState.Gauge<number | bigint> = internal.isGaugeState

/**
 * @since 2.0.0
 * @category refinements
 */
export const isHistogramState: (u: unknown) => u is MetricState.Histogram = internal.isHistogramState

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSummaryState: (u: unknown) => u is MetricState.Summary = internal.isSummaryState

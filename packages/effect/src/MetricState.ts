/**
 * @since 1.0.0
 */
import type * as Chunk from "./Chunk"
import type * as Equal from "./Equal"
import type * as HashMap from "./HashMap"
import * as internal from "./internal/metric/state"
import type * as MetricKeyType from "./MetricKeyType"
import type * as Option from "./Option"
import type { Pipeable } from "./Pipeable"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricStateTypeId: unique symbol = internal.MetricStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricStateTypeId = typeof MetricStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const CounterStateTypeId: unique symbol = internal.CounterStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CounterStateTypeId = typeof CounterStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const FrequencyStateTypeId: unique symbol = internal.FrequencyStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FrequencyStateTypeId = typeof FrequencyStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const GaugeStateTypeId: unique symbol = internal.GaugeStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type GaugeStateTypeId = typeof GaugeStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const HistogramStateTypeId: unique symbol = internal.HistogramStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type HistogramStateTypeId = typeof HistogramStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const SummaryStateTypeId: unique symbol = internal.SummaryStateTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SummaryStateTypeId = typeof SummaryStateTypeId

/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricStateType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @since 1.0.0
 * @category models
 */
export interface MetricState<A> extends MetricState.Variance<A>, Equal.Equal, Pipeable {}

/**
 * @since 1.0.0
 */
export declare namespace MetricState {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Untyped extends MetricState<any> {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Counter extends MetricState<MetricKeyType.MetricKeyType.Counter> {
    readonly [CounterStateTypeId]: CounterStateTypeId
    readonly count: number
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Frequency extends MetricState<MetricKeyType.MetricKeyType.Frequency> {
    readonly [FrequencyStateTypeId]: FrequencyStateTypeId
    readonly occurrences: HashMap.HashMap<string, number>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Gauge extends MetricState<MetricKeyType.MetricKeyType.Gauge> {
    readonly [GaugeStateTypeId]: GaugeStateTypeId
    readonly value: number
  }

  /**
   * @since 1.0.0
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
   * @since 1.0.0
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
   * @since 1.0.0
   * @category models
   */
  export interface Variance<A> {
    readonly [MetricStateTypeId]: {
      readonly _A: (_: A) => void
    }
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const counter: (count: number) => MetricState.Counter = internal.counter

/**
 * @since 1.0.0
 * @category constructors
 */
export const frequency: (occurrences: HashMap.HashMap<string, number>) => MetricState.Frequency = internal.frequency

/**
 * @since 1.0.0
 * @category constructors
 */
export const gauge: (value: number) => MetricState.Gauge = internal.gauge

/**
 * @since 1.0.0
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
 * @since 1.0.0
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
 * @since 1.0.0
 * @category refinements
 */
export const isMetricState: (u: unknown) => u is MetricState.Counter = internal.isMetricState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCounterState: (u: unknown) => u is MetricState.Counter = internal.isCounterState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFrequencyState: (u: unknown) => u is MetricState.Frequency = internal.isFrequencyState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isGaugeState: (u: unknown) => u is MetricState.Gauge = internal.isGaugeState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHistogramState: (u: unknown) => u is MetricState.Histogram = internal.isHistogramState

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSummaryState: (u: unknown) => u is MetricState.Summary = internal.isSummaryState

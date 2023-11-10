/**
 * @since 2.0.0
 */
import type { Chunk } from "../Chunk.js"
import type { HashMap } from "../HashMap.js"
import * as internal from "../internal/metric/state.js"
import type { Option } from "../Option.js"

import type { MetricState } from "../MetricState.js"

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
export const frequency: (occurrences: HashMap<string, number>) => MetricState.Frequency = internal.frequency

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
    readonly buckets: Chunk<readonly [number, number]>
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
    readonly quantiles: Chunk<readonly [number, Option<number>]>
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

/**
 * @since 2.0.0
 */
import type { Chunk } from "../Chunk.js"
import type { Duration } from "../Duration.js"
import * as internal from "../internal/metric/keyType.js"
import type { MetricBoundaries } from "../MetricBoundaries.js"

import type { MetricKeyType } from "../MetricKeyType.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricKeyTypeTypeId: unique symbol = internal.MetricKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricKeyTypeTypeId = typeof MetricKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const CounterKeyTypeTypeId: unique symbol = internal.CounterKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type CounterKeyTypeTypeId = typeof CounterKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const FrequencyKeyTypeTypeId: unique symbol = internal.FrequencyKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type FrequencyKeyTypeTypeId = typeof FrequencyKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const GaugeKeyTypeTypeId: unique symbol = internal.GaugeKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type GaugeKeyTypeTypeId = typeof GaugeKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const HistogramKeyTypeTypeId: unique symbol = internal.HistogramKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type HistogramKeyTypeTypeId = typeof HistogramKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export const SummaryKeyTypeTypeId: unique symbol = internal.SummaryKeyTypeTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type SummaryKeyTypeTypeId = typeof SummaryKeyTypeTypeId

/**
 * @since 2.0.0
 * @category constructors
 */
export const counter: <A extends number | bigint>() => MetricKeyType.Counter<A> = internal.counter

/**
 * @since 2.0.0
 * @category constructors
 */
export const frequency: MetricKeyType.Frequency = internal.frequency

/**
 * @since 2.0.0
 * @category constructors
 */
export const gauge: <A extends number | bigint>() => MetricKeyType.Gauge<A> = internal.gauge

/**
 * @since 2.0.0
 * @category constructors
 */
export const histogram: (boundaries: MetricBoundaries) => MetricKeyType.Histogram = internal.histogram

/**
 * @since 2.0.0
 * @category constructors
 */
export const summary: (
  options: {
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk<number>
  }
) => MetricKeyType.Summary = internal.summary

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricKeyType: (u: unknown) => u is MetricKeyType<unknown, unknown> = internal.isMetricKeyType

/**
 * @since 2.0.0
 * @category refinements
 */
export const isCounterKey: (u: unknown) => u is MetricKeyType.Counter<number | bigint> = internal.isCounterKey

/**
 * @since 2.0.0
 * @category refinements
 */
export const isFrequencyKey: (u: unknown) => u is MetricKeyType.Frequency = internal.isFrequencyKey

/**
 * @since 2.0.0
 * @category refinements
 */
export const isGaugeKey: (u: unknown) => u is MetricKeyType.Gauge<number | bigint> = internal.isGaugeKey

/**
 * @since 2.0.0
 * @category refinements
 */
export const isHistogramKey: (u: unknown) => u is MetricKeyType.Histogram = internal.isHistogramKey

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSummaryKey: (u: unknown) => u is MetricKeyType.Summary = internal.isSummaryKey

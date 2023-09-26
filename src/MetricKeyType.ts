/**
 * @since 1.0.0
 */
import type * as Chunk from "./Chunk"
import type * as Duration from "./Duration"
import type * as Equal from "./Equal"
import * as internal from "./internal/metric/keyType"
import type * as MetricBoundaries from "./MetricBoundaries"
import type * as MetricState from "./MetricState"
import type { Pipeable } from "./Pipeable"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricKeyTypeTypeId: unique symbol = internal.MetricKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricKeyTypeTypeId = typeof MetricKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const CounterKeyTypeTypeId: unique symbol = internal.CounterKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type CounterKeyTypeTypeId = typeof CounterKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const FrequencyKeyTypeTypeId: unique symbol = internal.FrequencyKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type FrequencyKeyTypeTypeId = typeof FrequencyKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const GaugeKeyTypeTypeId: unique symbol = internal.GaugeKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type GaugeKeyTypeTypeId = typeof GaugeKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const HistogramKeyTypeTypeId: unique symbol = internal.HistogramKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type HistogramKeyTypeTypeId = typeof HistogramKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const SummaryKeyTypeTypeId: unique symbol = internal.SummaryKeyTypeTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type SummaryKeyTypeTypeId = typeof SummaryKeyTypeTypeId

/**
 * @since 1.0.0
 * @category modelz
 */
export interface MetricKeyType<In, Out> extends MetricKeyType.Variance<In, Out>, Equal.Equal, Pipeable {}

/**
 * @since 1.0.0
 */
export declare namespace MetricKeyType {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Untyped = MetricKeyType<any, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Counter = MetricKeyType<number, MetricState.MetricState.Counter> & {
    readonly [CounterKeyTypeTypeId]: CounterKeyTypeTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Frequency = MetricKeyType<string, MetricState.MetricState.Frequency> & {
    readonly [FrequencyKeyTypeTypeId]: FrequencyKeyTypeTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Gauge = MetricKeyType<number, MetricState.MetricState.Gauge> & {
    readonly [GaugeKeyTypeTypeId]: GaugeKeyTypeTypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Histogram = MetricKeyType<number, MetricState.MetricState.Histogram> & {
    readonly [HistogramKeyTypeTypeId]: HistogramKeyTypeTypeId
    readonly boundaries: MetricBoundaries.MetricBoundaries
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Summary = MetricKeyType<readonly [number, number], MetricState.MetricState.Summary> & {
    readonly [SummaryKeyTypeTypeId]: SummaryKeyTypeTypeId
    readonly maxAge: Duration.Duration
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk.Chunk<number>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<In, Out> {
    readonly [MetricKeyTypeTypeId]: {
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type InType<Type extends MetricKeyType<any, any>> = [Type] extends [
    {
      readonly [MetricKeyTypeTypeId]: {
        readonly _In: (_: infer In) => void
      }
    }
  ] ? In
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type OutType<Type extends MetricKeyType<any, any>> = [Type] extends [
    {
      readonly [MetricKeyTypeTypeId]: {
        readonly _Out: (_: never) => infer Out
      }
    }
  ] ? Out
    : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const counter: MetricKeyType.Counter = internal.counter

/**
 * @since 1.0.0
 * @category constructors
 */
export const frequency: MetricKeyType.Frequency = internal.frequency

/**
 * @since 1.0.0
 * @category constructors
 */
export const gauge: MetricKeyType.Gauge = internal.gauge

/**
 * @since 1.0.0
 * @category constructors
 */
export const histogram: (boundaries: MetricBoundaries.MetricBoundaries) => MetricKeyType.Histogram = internal.histogram

/**
 * @since 1.0.0
 * @category constructors
 */
export const summary: (
  options: {
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk.Chunk<number>
  }
) => MetricKeyType.Summary = internal.summary

/**
 * @since 1.0.0
 * @category refinements
 */
export const isMetricKeyType: (u: unknown) => u is MetricKeyType<unknown, unknown> = internal.isMetricKeyType

/**
 * @since 1.0.0
 * @category refinements
 */
export const isCounterKey: (u: unknown) => u is MetricKeyType.Counter = internal.isCounterKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isFrequencyKey: (u: unknown) => u is MetricKeyType.Frequency = internal.isFrequencyKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isGaugeKey: (u: unknown) => u is MetricKeyType.Gauge = internal.isGaugeKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isHistogramKey: (u: unknown) => u is MetricKeyType.Histogram = internal.isHistogramKey

/**
 * @since 1.0.0
 * @category refinements
 */
export const isSummaryKey: (u: unknown) => u is MetricKeyType.Summary = internal.isSummaryKey

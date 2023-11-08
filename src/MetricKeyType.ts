import type { Chunk } from "./Chunk.js"
import type { Duration } from "./Duration.js"
import type { Equal } from "./Equal.js"
import type { MetricBoundaries } from "./MetricBoundaries.js"
import type {
  CounterKeyTypeTypeId,
  FrequencyKeyTypeTypeId,
  GaugeKeyTypeTypeId,
  HistogramKeyTypeTypeId,
  MetricKeyTypeTypeId,
  SummaryKeyTypeTypeId
} from "./MetricKeyType.impl.js"
import type { MetricState } from "./MetricState.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./internal/Jumpers/MetricKeyType.js"
export * from "./MetricKeyType.impl.js"
export declare namespace MetricKeyType {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MetricKeyType.impl.js"
}
/**
 * @since 2.0.0
 * @category modelz
 */
export interface MetricKeyType<In, Out> extends MetricKeyType.Variance<In, Out>, Equal, Pipeable {}

/**
 * @since 2.0.0
 */
export declare namespace MetricKeyType {
  /**
   * @since 2.0.0
   * @category models
   */
  export type Untyped = MetricKeyType<any, any>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Counter<A extends (number | bigint)> = MetricKeyType<A, MetricState.Counter<A>> & {
    readonly [CounterKeyTypeTypeId]: CounterKeyTypeTypeId
    readonly incremental: boolean
    readonly bigint: boolean
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type Frequency = MetricKeyType<string, MetricState.Frequency> & {
    readonly [FrequencyKeyTypeTypeId]: FrequencyKeyTypeTypeId
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type Gauge<A extends (number | bigint)> = MetricKeyType<A, MetricState.Gauge<A>> & {
    readonly [GaugeKeyTypeTypeId]: GaugeKeyTypeTypeId
    readonly bigint: boolean
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type Histogram = MetricKeyType<number, MetricState.Histogram> & {
    readonly [HistogramKeyTypeTypeId]: HistogramKeyTypeTypeId
    readonly boundaries: MetricBoundaries
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export type Summary = MetricKeyType<readonly [number, number], MetricState.Summary> & {
    readonly [SummaryKeyTypeTypeId]: SummaryKeyTypeTypeId
    readonly maxAge: Duration
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk<number>
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<In, Out> {
    readonly [MetricKeyTypeTypeId]: {
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }

  /**
   * @since 2.0.0
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
   * @since 2.0.0
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

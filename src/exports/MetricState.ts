import type {
  CounterStateTypeId,
  FrequencyStateTypeId,
  GaugeStateTypeId,
  HistogramStateTypeId,
  MetricStateTypeId,
  SummaryStateTypeId
} from "../MetricState.js"
import type { Chunk } from "./Chunk.js"
import type { Equal } from "./Equal.js"
import type { HashMap } from "./HashMap.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

export * from "../internal/Jumpers/MetricState.js"
export * from "../MetricState.js"

export declare namespace MetricState {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../MetricState.js"
}
/**
 * A `MetricState` describes the state of a metric. The type parameter of a
 * metric state corresponds to the type of the metric key (`MetricStateType`).
 * This phantom type parameter is used to tie keys to their expected states.
 *
 * @since 2.0.0
 * @category models
 */
export interface MetricState<A> extends MetricState.Variance<A>, Equal, Pipeable {}

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
  export interface Counter<A extends (number | bigint)> extends MetricState<MetricKeyType.Counter<A>> {
    readonly [CounterStateTypeId]: CounterStateTypeId
    readonly count: A
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Frequency extends MetricState<MetricKeyType.Frequency> {
    readonly [FrequencyStateTypeId]: FrequencyStateTypeId
    readonly occurrences: HashMap<string, number>
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Gauge<A extends (number | bigint)> extends MetricState<MetricKeyType.Gauge<A>> {
    readonly [GaugeStateTypeId]: GaugeStateTypeId
    readonly value: A
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Histogram extends MetricState<MetricKeyType.Histogram> {
    readonly [HistogramStateTypeId]: HistogramStateTypeId
    readonly buckets: Chunk<readonly [number, number]>
    readonly count: number
    readonly min: number
    readonly max: number
    readonly sum: number
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Summary extends MetricState<MetricKeyType.Summary> {
    readonly [SummaryStateTypeId]: SummaryStateTypeId
    readonly error: number
    readonly quantiles: Chunk<readonly [number, Option<number>]>
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

/**
 * @since 2.0.0
 */
import type { LazyArg } from "./Function"
import * as internal from "./internal/metric/hook"
import type * as MetricKey from "./MetricKey"
import type * as MetricState from "./MetricState"
import type { Pipeable } from "./Pipeable"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricHookTypeId: unique symbol = internal.MetricHookTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricHookTypeId = typeof MetricHookTypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface MetricHook<In, Out> extends MetricHook.Variance<In, Out>, Pipeable {
  readonly get: () => Out
  readonly update: (input: In) => void
}

/**
 * @since 2.0.0
 */
export declare namespace MetricHook {
  /**
   * @since 2.0.0
   * @category models
   */
  export type Root = MetricHook<any, MetricState.MetricState.Untyped>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Untyped = MetricHook<any, any>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Counter = MetricHook<number, MetricState.MetricState.Counter>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Gauge = MetricHook<number, MetricState.MetricState.Gauge>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Frequency = MetricHook<string, MetricState.MetricState.Frequency>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Histogram = MetricHook<number, MetricState.MetricState.Histogram>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Summary = MetricHook<readonly [number, number], MetricState.MetricState.Summary>

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<In, Out> {
    readonly [MetricHookTypeId]: {
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <In, Out>(options: {
  readonly get: LazyArg<Out>
  readonly update: (input: In) => void
}) => MetricHook<In, Out> = internal.make

/**
 * @since 2.0.0
 * @category constructors
 */
export const counter: (_key: MetricKey.MetricKey.Counter) => MetricHook.Counter = internal.counter

/**
 * @since 2.0.0
 * @category constructors
 */
export const frequency: (_key: MetricKey.MetricKey.Frequency) => MetricHook.Frequency = internal.frequency

/**
 * @since 2.0.0
 * @category constructors
 */
export const gauge: (_key: MetricKey.MetricKey.Gauge, startAt: number) => MetricHook.Gauge = internal.gauge

/**
 * @since 2.0.0
 * @category constructors
 */
export const histogram: (key: MetricKey.MetricKey.Histogram) => MetricHook.Histogram = internal.histogram

/**
 * @since 2.0.0
 * @category constructors
 */
export const summary: (key: MetricKey.MetricKey.Summary) => MetricHook.Summary = internal.summary

/**
 * @since 2.0.0
 * @category utils
 */
export const onUpdate: {
  <In, Out>(f: (input: In) => void): (self: MetricHook<In, Out>) => MetricHook<In, Out>
  <In, Out>(self: MetricHook<In, Out>, f: (input: In) => void): MetricHook<In, Out>
} = internal.onUpdate

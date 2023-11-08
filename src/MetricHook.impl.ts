/**
 * @since 2.0.0
 */
import type { LazyArg } from "./Function.js"
import * as internal from "./internal/metric/hook.js"
import type { MetricKey } from "./MetricKey.js"
import type { MetricState } from "./MetricState.js"
import type { Pipeable } from "./Pipeable.js"

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
  export namespace MetricHook {
    /**
     * @since 2.0.0
     * @category models
     */
    export type Root = MetricHook<any, MetricState.Untyped>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Untyped = MetricHook<any, any>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Counter<A extends (number | bigint)> = MetricHook<A, MetricState.Counter<A>>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Gauge<A extends (number | bigint)> = MetricHook<A, MetricState.Gauge<A>>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Frequency = MetricHook<string, MetricState.Frequency>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Histogram = MetricHook<number, MetricState.Histogram>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Summary = MetricHook<readonly [number, number], MetricState.Summary>

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
export const counter: <A extends (number | bigint)>(key: MetricKey.Counter<A>) => MetricHook.Counter<A> =
  internal.counter

/**
 * @since 2.0.0
 * @category constructors
 */
export const frequency: (_key: MetricKey.Frequency) => MetricHook.Frequency = internal.frequency

/**
 * @since 2.0.0
 * @category constructors
 */
export const gauge: {
  (key: MetricKey.Gauge<number>, startAt: number): MetricHook.Gauge<number>
  (key: MetricKey.Gauge<bigint>, startAt: bigint): MetricHook.Gauge<bigint>
} = internal.gauge

/**
 * @since 2.0.0
 * @category constructors
 */
export const histogram: (key: MetricKey.Histogram) => MetricHook.Histogram = internal.histogram

/**
 * @since 2.0.0
 * @category constructors
 */
export const summary: (key: MetricKey.Summary) => MetricHook.Summary = internal.summary

/**
 * @since 2.0.0
 * @category utils
 */
export const onUpdate: {
  <In, Out>(f: (input: In) => void): (self: MetricHook<In, Out>) => MetricHook<In, Out>
  <In, Out>(self: MetricHook<In, Out>, f: (input: In) => void): MetricHook<In, Out>
} = internal.onUpdate

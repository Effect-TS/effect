/**
 * @since 2.0.0
 */
import type { MetricHookTypeId } from "./impl/MetricHook.js"
import type { MetricState } from "./MetricState.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/MetricHook.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/MetricHook.js"

/**
 * @since 2.0.0
 */
export declare namespace MetricHook {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MetricHook.js"
}
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

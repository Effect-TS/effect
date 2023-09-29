/**
 * @since 2.0.0
 */
import * as internal from "./internal/metric/pair"
import type * as MetricKey from "./MetricKey"
import type * as MetricKeyType from "./MetricKeyType"
import type * as MetricState from "./MetricState"
import type { Pipeable } from "./Pipeable"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricPairTypeId: unique symbol = internal.MetricPairTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricPairTypeId = typeof MetricPairTypeId

/**
 * @since 2.0.0
 * @category model
 */
export interface MetricPair<Type extends MetricKeyType.MetricKeyType<any, any>>
  extends MetricPair.Variance<Type>, Pipeable
{
  readonly metricKey: MetricKey.MetricKey<Type>
  readonly metricState: MetricState.MetricState<MetricKeyType.MetricKeyType.OutType<Type>>
}

/**
 * @since 2.0.0
 */
export declare namespace MetricPair {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Untyped extends MetricPair<MetricKeyType.MetricKeyType<any, any>> {}

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Type extends MetricKeyType.MetricKeyType<any, any>> {
    readonly [MetricPairTypeId]: {
      readonly _Type: (_: never) => Type
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  metricKey: MetricKey.MetricKey<Type>,
  metricState: MetricState.MetricState<MetricKeyType.MetricKeyType.OutType<Type>>
) => MetricPair.Untyped = internal.make

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  metricKey: MetricKey.MetricKey<Type>,
  metricState: MetricState.MetricState.Untyped
) => MetricPair.Untyped = internal.unsafeMake

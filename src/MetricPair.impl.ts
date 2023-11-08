/**
 * @since 2.0.0
 */
import * as internal from "./internal/metric/pair.js"
import type { MetricKey } from "./MetricKey.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricState } from "./MetricState.js"
import type { Pipeable } from "./Pipeable.js"

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
  export interface MetricPair<Type extends MetricKeyType<any, any>> extends MetricPair.Variance<Type>, Pipeable {
    readonly metricKey: MetricKey<Type>
    readonly metricState: MetricState<MetricKeyType.OutType<Type>>
  }

  /**
   * @since 2.0.0
   */
  export namespace MetricPair {
    /**
     * @since 2.0.0
     * @category models
     */
    export interface Untyped extends MetricPair<MetricKeyType<any, any>> {}

    /**
     * @since 2.0.0
     * @category models
     */
    export interface Variance<Type extends MetricKeyType<any, any>> {
      readonly [MetricPairTypeId]: {
        readonly _Type: (_: never) => Type
      }
    }
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: <Type extends MetricKeyType<any, any>>(
  metricKey: MetricKey<Type>,
  metricState: MetricState<MetricKeyType.OutType<Type>>
) => MetricPair.Untyped = internal.make

/**
 * @since 2.0.0
 * @category unsafe
 */
export const unsafeMake: <Type extends MetricKeyType<any, any>>(
  metricKey: MetricKey<Type>,
  metricState: MetricState.Untyped
) => MetricPair.Untyped = internal.unsafeMake

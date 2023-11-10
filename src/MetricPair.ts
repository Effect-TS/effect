/**
 * @since 2.0.0
 */
import type { MetricPairTypeId } from "./impl/MetricPair.js"
import type { MetricKey } from "./MetricKey.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricState } from "./MetricState.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/MetricPair.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/MetricPair.js"

/**
 * @since 2.0.0
 */
export declare namespace MetricPair {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MetricPair.js"
}
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
export declare namespace MetricPair {
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

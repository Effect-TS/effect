import type { Equal } from "./Equal.js"
import type { HashSet } from "./HashSet.js"
import type { MetricKeyTypeId } from "./impl/MetricKey.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricLabel } from "./MetricLabel.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./impl/MetricKey.js"
export * from "./internal/Jumpers/MetricKey.js"

export declare namespace MetricKey {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MetricKey.js"
}
/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and tags associated with the
 * metric, an optional description of the key, and any other information to
 * describe a metric, such as the boundaries of a histogram. In this way, it is
 * impossible to ever create different metrics with conflicting keys.
 *
 * @since 2.0.0
 * @category models
 */
export interface MetricKey<Type extends MetricKeyType<any, any>> extends MetricKey.Variance<Type>, Equal, Pipeable {
  readonly name: string
  readonly keyType: Type
  readonly description: Option<string>
  readonly tags: HashSet<MetricLabel>
}

/**
 * @since 2.0.0
 */
export declare namespace MetricKey {
  /**
   * @since 2.0.0
   * @category models
   */
  export type Untyped = MetricKey<any>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Counter<A extends (number | bigint)> = MetricKey<MetricKeyType.Counter<A>>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Gauge<A extends (number | bigint)> = MetricKey<MetricKeyType.Gauge<A>>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Frequency = MetricKey<MetricKeyType.Frequency>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Histogram = MetricKey<MetricKeyType.Histogram>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Summary = MetricKey<MetricKeyType.Summary>

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<Type> {
    readonly [MetricKeyTypeId]: {
      _Type: (_: never) => Type
    }
  }
}

/**
 * @since 2.0.0
 */
import type { HashSet } from "./HashSet.js"
import * as internal from "./internal/metric/registry.js"
import type { MetricHook } from "./MetricHook.js"
import type { MetricKey } from "./MetricKey.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricPair } from "./MetricPair.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricRegistryTypeId: unique symbol = internal.MetricRegistryTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricRegistryTypeId = typeof MetricRegistryTypeId

import type { MetricRegistry } from "../../MetricRegistry.js"

export declare namespace MetricRegistry {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MetricRegistry.impl.js"
}
  /**
   * @since 2.0.0
   * @category models
   */
  export interface MetricRegistry {
    readonly [MetricRegistryTypeId]: MetricRegistryTypeId
    snapshot(): HashSet<MetricPair.Untyped>
    get<Type extends MetricKeyType<any, any>>(
      key: MetricKey<Type>
    ): MetricHook<
      MetricKeyType.InType<typeof key["keyType"]>,
      MetricKeyType.OutType<typeof key["keyType"]>
    >
    getCounter<A extends (number | bigint)>(key: MetricKey.Counter<A>): MetricHook.Counter<A>
    getFrequency(key: MetricKey.Frequency): MetricHook.Frequency
    getGauge<A extends (number | bigint)>(key: MetricKey.Gauge<A>): MetricHook.Gauge<A>
    getHistogram(key: MetricKey.Histogram): MetricHook.Histogram
    getSummary(key: MetricKey.Summary): MetricHook.Summary
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (_: void) => MetricRegistry = internal.make

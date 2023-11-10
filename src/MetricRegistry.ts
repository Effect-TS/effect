/**
 * @since 2.0.0
 */
import type { HashSet } from "./HashSet.js"
import type { MetricRegistryTypeId } from "./impl/MetricRegistry.js"
import type { MetricHook } from "./MetricHook.js"
import type { MetricKey } from "./MetricKey.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricPair } from "./MetricPair.js"

/**
 * @since 2.0.0
 */
export * from "./impl/MetricRegistry.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/MetricRegistry.js"

/**
 * @since 2.0.0
 */
export declare namespace MetricRegistry {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/MetricRegistry.js"
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

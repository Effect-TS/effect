/**
 * @since 2.0.0
 */
import type * as HashSet from "./HashSet.js"
import * as internal from "./internal/metric/registry.js"
import type * as MetricHook from "./MetricHook.js"
import type * as MetricKey from "./MetricKey.js"
import type * as MetricKeyType from "./MetricKeyType.js"
import type * as MetricPair from "./MetricPair.js"

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

/**
 * @since 2.0.0
 * @category models
 */
export interface MetricRegistry {
  readonly [MetricRegistryTypeId]: MetricRegistryTypeId
  readonly snapshot: () => HashSet.HashSet<MetricPair.MetricPair.Untyped>
  readonly get: <Type extends MetricKeyType.MetricKeyType<any, any>>(
    key: MetricKey.MetricKey<Type>
  ) => MetricHook.MetricHook<
    MetricKeyType.MetricKeyType.InType<typeof key["keyType"]>,
    MetricKeyType.MetricKeyType.OutType<typeof key["keyType"]>
  >
  readonly getCounter: <A extends (number | bigint)>(
    key: MetricKey.MetricKey.Counter<A>
  ) => MetricHook.MetricHook.Counter<A>
  readonly getFrequency: (key: MetricKey.MetricKey.Frequency) => MetricHook.MetricHook.Frequency
  readonly getGauge: <A extends (number | bigint)>(key: MetricKey.MetricKey.Gauge<A>) => MetricHook.MetricHook.Gauge<A>
  readonly getHistogram: (key: MetricKey.MetricKey.Histogram) => MetricHook.MetricHook.Histogram
  readonly getSummary: (key: MetricKey.MetricKey.Summary) => MetricHook.MetricHook.Summary
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (_: void) => MetricRegistry = internal.make

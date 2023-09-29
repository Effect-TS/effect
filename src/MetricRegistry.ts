/**
 * @since 2.0.0
 */
import type * as HashSet from "./HashSet"
import * as internal from "./internal/metric/registry"
import type * as MetricHook from "./MetricHook"
import type * as MetricKey from "./MetricKey"
import type * as MetricKeyType from "./MetricKeyType"
import type * as MetricPair from "./MetricPair"

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
  snapshot(): HashSet.HashSet<MetricPair.MetricPair.Untyped>
  get<Type extends MetricKeyType.MetricKeyType<any, any>>(
    key: MetricKey.MetricKey<Type>
  ): MetricHook.MetricHook<
    MetricKeyType.MetricKeyType.InType<typeof key["keyType"]>,
    MetricKeyType.MetricKeyType.OutType<typeof key["keyType"]>
  >
  getCounter(key: MetricKey.MetricKey.Counter): MetricHook.MetricHook.Counter
  getFrequency(key: MetricKey.MetricKey.Frequency): MetricHook.MetricHook.Frequency
  getGauge(key: MetricKey.MetricKey.Gauge): MetricHook.MetricHook.Gauge
  getHistogram(key: MetricKey.MetricKey.Histogram): MetricHook.MetricHook.Histogram
  getSummary(key: MetricKey.MetricKey.Summary): MetricHook.MetricHook.Summary
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (_: void) => MetricRegistry = internal.make

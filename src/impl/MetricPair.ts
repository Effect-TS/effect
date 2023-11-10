import * as internal from "../internal/metric/pair.js"
import type * as MetricKey from "../MetricKey.js"
import type * as MetricKeyType from "../MetricKeyType.js"
import type { MetricPair } from "../MetricPair.js"
import type * as MetricState from "../MetricState.js"

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

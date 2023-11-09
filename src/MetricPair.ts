/**
 * @since 2.0.0
 */
import type { MetricKey } from "./exports/MetricKey.js"
import type { MetricKeyType } from "./exports/MetricKeyType.js"
import type { MetricState } from "./exports/MetricState.js"
import * as internal from "./internal/metric/pair.js"

import type { MetricPair } from "./exports/MetricPair.js"

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

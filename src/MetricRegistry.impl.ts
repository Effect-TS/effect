/**
 * @since 2.0.0
 */
import type { HashSet } from "./HashSet.js"
import * as internal from "./internal/metric/registry.js"
import type { MetricHook } from "./MetricHook.js"
import type { MetricKey } from "./MetricKey.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricPair } from "./MetricPair.js"

import type { MetricRegistry } from "./MetricRegistry.js"

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
 * @category constructors
 */
export const make: (_: void) => MetricRegistry = internal.make

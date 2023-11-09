/**
 * @since 2.0.0
 */
import * as internal from "./internal/metric/registry.js"

import type { MetricRegistry } from "./exports/MetricRegistry.js"

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

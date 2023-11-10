/**
 * @since 2.0.0
 */
import * as internal from "../internal/metric/label.js"

import type { MetricLabel } from "../MetricLabel.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricLabelTypeId: unique symbol = internal.MetricLabelTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricLabelTypeId = typeof MetricLabelTypeId

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (key: string, value: string) => MetricLabel = internal.make

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricLabel: (u: unknown) => u is MetricLabel = internal.isMetricLabel

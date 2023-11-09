/**
 * @since 2.0.0
 */
import type { Chunk } from "./exports/Chunk.js"
import type { Duration } from "./exports/Duration.js"
import type { HashSet } from "./exports/HashSet.js"
import type { MetricBoundaries } from "./exports/MetricBoundaries.js"
import type { MetricKeyType } from "./exports/MetricKeyType.js"
import type { MetricLabel } from "./exports/MetricLabel.js"
import * as internal from "./internal/metric/key.js"

import type { MetricKey } from "./exports/MetricKey.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const MetricKeyTypeId: unique symbol = internal.MetricKeyTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type MetricKeyTypeId = typeof MetricKeyTypeId

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricKey: (u: unknown) => u is MetricKey<MetricKeyType<unknown, unknown>> = internal.isMetricKey

/**
 * Creates a metric key for a counter, with the specified name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const counter: {
  (
    name: string,
    options?: {
      readonly description?: string
      readonly bigint?: false
      readonly incremental?: boolean
    }
  ): MetricKey.Counter<number>
  (
    name: string,
    options: {
      readonly description?: string
      readonly bigint: true
      readonly incremental?: boolean
    }
  ): MetricKey.Counter<bigint>
} = internal.counter

/**
 * Creates a metric key for a categorical frequency table, with the specified
 * name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const frequency: (name: string, description?: string) => MetricKey.Frequency = internal.frequency

/**
 * Creates a metric key for a gauge, with the specified name.
 *
 * @since 2.0.0
 * @category constructors
 */
export const gauge: {
  (name: string, options?: { readonly description?: string; readonly bigint?: false }): MetricKey.Gauge<number>
  (name: string, options: { readonly description?: string; readonly bigint: true }): MetricKey.Gauge<bigint>
} = internal.gauge

/**
 * Creates a metric key for a histogram, with the specified name and boundaries.
 *
 * @since 2.0.0
 * @category constructors
 */
export const histogram: (
  name: string,
  boundaries: MetricBoundaries,
  description?: string
) => MetricKey.Histogram = internal.histogram

/**
 * Creates a metric key for a summary, with the specified name, maxAge,
 * maxSize, error, and quantiles.
 *
 * @since 2.0.0
 * @category constructors
 */
export const summary: (
  options: {
    readonly name: string
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk<number>
    readonly description?: string
  }
) => MetricKey.Summary = internal.summary

/**
 * Returns a new `MetricKey` with the specified tag appended.
 *
 * @since 2.0.0
 * @category constructors
 */
export const tagged: {
  (
    key: string,
    value: string
  ): <Type extends MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    key: string,
    value: string
  ): MetricKey<Type>
} = internal.tagged

/**
 * Returns a new `MetricKey` with the specified tags appended.
 *
 * @since 2.0.0
 * @category constructors
 */
export const taggedWithLabels: {
  (
    extraTags: Iterable<MetricLabel>
  ): <Type extends MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: Iterable<MetricLabel>
  ): MetricKey<Type>
} = internal.taggedWithLabels

/**
 * Returns a new `MetricKey` with the specified tags appended.
 *
 * @since 2.0.0
 * @category constructors
 */
export const taggedWithLabelSet: {
  (
    extraTags: HashSet<MetricLabel>
  ): <Type extends MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: HashSet<MetricLabel>
  ): MetricKey<Type>
} = internal.taggedWithLabelSet

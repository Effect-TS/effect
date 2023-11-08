/**
 * @since 2.0.0
 */
import type { Chunk } from "./Chunk.js"
import type { Duration } from "./Duration.js"
import type { Equal } from "./Equal.js"
import type { HashSet } from "./HashSet.js"
import * as internal from "./internal/metric/key.js"
import type { MetricBoundaries } from "./MetricBoundaries.js"
import type { MetricKeyType } from "./MetricKeyType.js"
import type { MetricLabel } from "./MetricLabel.js"
import type { Option } from "./Option.js"
import type { Pipeable } from "./Pipeable.js"

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

import type { MetricKey } from "./MetricKey.js"

export declare namespace MetricKey {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./MetricKey.impl.js"
}
  /**
   * A `MetricKey` is a unique key associated with each metric. The key is based
   * on a combination of the metric type, the name and tags associated with the
   * metric, an optional description of the key, and any other information to
   * describe a metric, such as the boundaries of a histogram. In this way, it is
   * impossible to ever create different metrics with conflicting keys.
   *
   * @since 2.0.0
   * @category models
   */
  export interface MetricKey<Type extends MetricKeyType<any, any>> extends MetricKey.Variance<Type>, Equal, Pipeable {
    readonly name: string
    readonly keyType: Type
    readonly description: Option<string>
    readonly tags: HashSet<MetricLabel>
  }

  /**
   * @since 2.0.0
   */
  export namespace MetricKey {
    /**
     * @since 2.0.0
     * @category models
     */
    export type Untyped = MetricKey<any>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Counter<A extends (number | bigint)> = MetricKey<MetricKeyType.Counter<A>>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Gauge<A extends (number | bigint)> = MetricKey<MetricKeyType.Gauge<A>>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Frequency = MetricKey<MetricKeyType.Frequency>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Histogram = MetricKey<MetricKeyType.Histogram>

    /**
     * @since 2.0.0
     * @category models
     */
    export type Summary = MetricKey<MetricKeyType.Summary>

    /**
     * @since 2.0.0
     * @category models
     */
    export interface Variance<Type> {
      readonly [MetricKeyTypeId]: {
        _Type: (_: never) => Type
      }
    }
  }
}

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

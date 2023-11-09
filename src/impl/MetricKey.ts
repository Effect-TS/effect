/**
 * @since 2.0.0
 */
import type * as Chunk from "./Chunk.js"
import type * as Duration from "./Duration.js"
import type * as Equal from "./Equal.js"
import type * as HashSet from "./HashSet.js"
import * as internal from "./internal/metric/key.js"
import type * as MetricBoundaries from "./MetricBoundaries.js"
import type * as MetricKeyType from "./MetricKeyType.js"
import type * as MetricLabel from "./MetricLabel.js"
import type * as Option from "./Option.js"
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
export interface MetricKey<Type extends MetricKeyType.MetricKeyType<any, any>>
  extends MetricKey.Variance<Type>, Equal.Equal, Pipeable
{
  readonly name: string
  readonly keyType: Type
  readonly description: Option.Option<string>
  readonly tags: HashSet.HashSet<MetricLabel.MetricLabel>
}

/**
 * @since 2.0.0
 */
export declare namespace MetricKey {
  /**
   * @since 2.0.0
   * @category models
   */
  export type Untyped = MetricKey<any>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Counter<A extends (number | bigint)> = MetricKey<MetricKeyType.MetricKeyType.Counter<A>>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Gauge<A extends (number | bigint)> = MetricKey<MetricKeyType.MetricKeyType.Gauge<A>>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Frequency = MetricKey<MetricKeyType.MetricKeyType.Frequency>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Histogram = MetricKey<MetricKeyType.MetricKeyType.Histogram>

  /**
   * @since 2.0.0
   * @category models
   */
  export type Summary = MetricKey<MetricKeyType.MetricKeyType.Summary>

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

/**
 * @since 2.0.0
 * @category refinements
 */
export const isMetricKey: (u: unknown) => u is MetricKey<MetricKeyType.MetricKeyType<unknown, unknown>> =
  internal.isMetricKey

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
  boundaries: MetricBoundaries.MetricBoundaries,
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
    readonly quantiles: Chunk.Chunk<number>
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
  ): <Type extends MetricKeyType.MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
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
    extraTags: Iterable<MetricLabel.MetricLabel>
  ): <Type extends MetricKeyType.MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: Iterable<MetricLabel.MetricLabel>
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
    extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
  ): <Type extends MetricKeyType.MetricKeyType<any, any>>(self: MetricKey<Type>) => MetricKey<Type>
  <Type extends MetricKeyType.MetricKeyType<any, any>>(
    self: MetricKey<Type>,
    extraTags: HashSet.HashSet<MetricLabel.MetricLabel>
  ): MetricKey<Type>
} = internal.taggedWithLabelSet

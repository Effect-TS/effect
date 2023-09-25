/**
 * @since 1.0.0
 */
import type * as Chunk from "./Chunk"
import type * as Duration from "./Duration"
import type * as Effect from "./Effect"
import type { LazyArg } from "./Function"
import type * as HashSet from "./HashSet"
import * as fiberRuntime from "./internal/fiberRuntime"
import * as internal from "./internal/metric"
import type * as MetricBoundaries from "./MetricBoundaries"
import type * as MetricKey from "./MetricKey"
import type * as MetricKeyType from "./MetricKeyType"
import type * as MetricLabel from "./MetricLabel"
import type * as MetricPair from "./MetricPair"
import type * as MetricRegistry from "./MetricRegistry"
import type * as MetricState from "./MetricState"
import type { Pipeable } from "./Pipeable"

/**
 * @since 1.0.0
 * @category symbols
 */
export const MetricTypeId: unique symbol = internal.MetricTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type MetricTypeId = typeof MetricTypeId

/**
 * A `Metric<Type, In, Out>` represents a concurrent metric which accepts
 * updates of type `In` and are aggregated to a stateful value of type `Out`.
 *
 * For example, a counter metric would have type `Metric<number, number>`,
 * representing the fact that the metric can be updated with numbers (the amount
 * to increment or decrement the counter by), and the state of the counter is a
 * number.
 *
 * There are five primitive metric types supported by Effect:
 *
 *   - Counters
 *   - Frequencies
 *   - Gauges
 *   - Histograms
 *   - Summaries
 *
 * @since 1.0.0
 * @category models
 */
export interface Metric<Type, In, Out> extends Metric.Variance<Type, In, Out>, Pipeable {
  /**
   * The type of the underlying primitive metric. For example, this could be
   * `MetricKeyType.Counter` or `MetricKeyType.Gauge`.
   */
  readonly keyType: Type
  readonly unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void
  readonly unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
  /** */
  <R, E, A extends In>(effect: Effect.Effect<R, E, A>): Effect.Effect<R, E, A>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface MetricApply {
  <Type, In, Out>(
    keyType: Type,
    unsafeUpdate: (input: In, extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => void,
    unsafeValue: (extraTags: HashSet.HashSet<MetricLabel.MetricLabel>) => Out
  ): Metric<Type, In, Out>
}

/**
 * @since 1.0.0
 */
export declare namespace Metric {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Counter<In>
    extends Metric<MetricKeyType.MetricKeyType.Counter, In, MetricState.MetricState.Counter>
  {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Gauge<In> extends Metric<MetricKeyType.MetricKeyType.Gauge, In, MetricState.MetricState.Gauge> {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Frequency<In>
    extends Metric<MetricKeyType.MetricKeyType.Frequency, In, MetricState.MetricState.Frequency>
  {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Histogram<In>
    extends Metric<MetricKeyType.MetricKeyType.Histogram, In, MetricState.MetricState.Histogram>
  {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Summary<In>
    extends Metric<MetricKeyType.MetricKeyType.Summary, In, MetricState.MetricState.Summary>
  {}

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Variance<Type, In, Out> {
    readonly [MetricTypeId]: {
      readonly _Type: (_: Type) => Type
      readonly _In: (_: In) => void
      readonly _Out: (_: never) => Out
    }
  }
}

/**
 * @since 1.0.0
 * @category globals
 */
export const globalMetricRegistry: MetricRegistry.MetricRegistry = internal.globalMetricRegistry

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: MetricApply = internal.make

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of the specified new type, which must be transformable to the input type of
 * this metric.
 *
 * @since 1.0.0
 * @category mapping
 */
export const mapInput: {
  <In, In2>(f: (input: In2) => In): <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, In2, Out>
  <Type, In, Out, In2>(self: Metric<Type, In, Out>, f: (input: In2) => In): Metric<Type, In2, Out>
} = internal.mapInput

/**
 * A counter, which can be incremented by numbers.
 *
 * @since 1.0.0
 * @category constructors
 */
export const counter: (name: string, description?: string) => Metric.Counter<number> = internal.counter

/**
 * A string histogram metric, which keeps track of the counts of different
 * strings.
 *
 * @since 1.0.0
 * @category constructors
 */
export const frequency: (name: string, description?: string) => Metric.Frequency<string> = internal.frequency

/**
 * Returns a new metric that is powered by this one, but which accepts updates
 * of any type, and translates them to updates with the specified constant
 * update value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const withConstantInput: {
  <In>(input: In): <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, unknown, Out>
  <Type, In, Out>(self: Metric<Type, In, Out>, input: In): Metric<Type, unknown, Out>
} = internal.withConstantInput

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromMetricKey: <Type extends MetricKeyType.MetricKeyType<any, any>>(
  key: MetricKey.MetricKey<Type>
) => Metric<Type, MetricKeyType.MetricKeyType.InType<Type>, MetricKeyType.MetricKeyType.OutType<Type>> =
  internal.fromMetricKey

/**
 * A gauge, which can be set to a value.
 *
 * @since 1.0.0
 * @category constructors
 */
export const gauge: (name: string, description?: string) => Metric.Gauge<number> = internal.gauge

/**
 * A numeric histogram metric, which keeps track of the count of numbers that
 * fall in bins with the specified boundaries.
 *
 * @since 1.0.0
 * @category constructors
 */
export const histogram: (
  name: string,
  boundaries: MetricBoundaries.MetricBoundaries,
  description?: string
) => Metric<MetricKeyType.MetricKeyType.Histogram, number, MetricState.MetricState.Histogram> = internal.histogram

/**
 * @since 1.0.0
 * @category aspects
 */
export const increment: (self: Metric.Counter<number>) => Effect.Effect<never, never, void> = internal.increment

/**
 * @since 1.0.0
 * @category aspects
 */
export const incrementBy: {
  (amount: number): (self: Metric.Counter<number>) => Effect.Effect<never, never, void>
  (self: Metric.Counter<number>, amount: number): Effect.Effect<never, never, void>
} = internal.incrementBy

/**
 * Returns a new metric that is powered by this one, but which outputs a new
 * state type, determined by transforming the state type of this metric by the
 * specified function.
 *
 * @since 1.0.0
 * @category mapping
 */
export const map: {
  <Out, Out2>(f: (out: Out) => Out2): <Type, In>(self: Metric<Type, In, Out>) => Metric<Type, In, Out2>
  <Type, In, Out, Out2>(self: Metric<Type, In, Out>, f: (out: Out) => Out2): Metric<Type, In, Out2>
} = internal.map

/**
 * @since 1.0.0
 * @category mapping
 */
export const mapType: {
  <Type, Type2>(f: (type: Type) => Type2): <In, Out>(self: Metric<Type, In, Out>) => Metric<Type2, In, Out>
  <Type, In, Out, Type2>(self: Metric<Type, In, Out>, f: (type: Type) => Type2): Metric<Type2, In, Out>
} = internal.mapType

/**
 * @since 1.0.0
 * @category aspects
 */
export const set: {
  <In>(value: In): (self: Metric.Gauge<In>) => Effect.Effect<never, never, void>
  <In>(self: Metric.Gauge<In>, value: In): Effect.Effect<never, never, void>
} = internal.set

/**
 * Captures a snapshot of all metrics recorded by the application.
 *
 * @since 1.0.0
 * @category getters
 */
export const snapshot: Effect.Effect<never, never, HashSet.HashSet<MetricPair.MetricPair.Untyped>> = internal.snapshot

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const succeed: <Out>(out: Out) => Metric<void, unknown, Out> = internal.succeed

/**
 * Creates a metric that ignores input and produces constant output.
 *
 * @since 1.0.0
 * @category constructors
 */
export const sync: <Out>(evaluate: LazyArg<Out>) => Metric<void, unknown, Out> = internal.sync

/**
 * @since 1.0.0
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
) => Metric.Summary<number> = internal.summary

/**
 * @since 1.0.0
 * @category constructors
 */
export const summaryTimestamp: (
  options: {
    readonly name: string
    readonly maxAge: Duration.DurationInput
    readonly maxSize: number
    readonly error: number
    readonly quantiles: Chunk.Chunk<number>
    readonly description?: string
  }
) => Metric.Summary<readonly [value: number, timestamp: number]> = internal.summaryTimestamp

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category utils
 */
export const tagged: {
  <Type, In, Out>(key: string, value: string): (self: Metric<Type, In, Out>) => Metric<Type, In, Out>
  <Type, In, Out>(self: Metric<Type, In, Out>, key: string, value: string): Metric<Type, In, Out>
} = internal.tagged

/**
 * Returns a new metric, which is identical in every way to this one, except
 * dynamic tags are added based on the update values. Note that the metric
 * returned by this method does not return any useful information, due to the
 * dynamic nature of the added tags.
 *
 * @since 1.0.0
 * @category utils
 */
export const taggedWithLabelsInput: {
  <In>(
    f: (input: In) => Iterable<MetricLabel.MetricLabel>
  ): <Type, Out>(self: Metric<Type, In, Out>) => Metric<Type, In, void>
  <Type, In, Out>(
    self: Metric<Type, In, Out>,
    f: (input: In) => Iterable<MetricLabel.MetricLabel>
  ): Metric<Type, In, void>
} = internal.taggedWithLabelsInput

/**
 * Returns a new metric, which is identical in every way to this one, except
 * the specified tags have been added to the tags of this metric.
 *
 * @since 1.0.0
 * @category utils
 */
export const taggedWithLabels: {
  <Type, In, Out>(extraTags: Iterable<MetricLabel.MetricLabel>): (self: Metric<Type, In, Out>) => Metric<Type, In, Out>
  <Type, In, Out>(self: Metric<Type, In, Out>, extraTags: Iterable<MetricLabel.MetricLabel>): Metric<Type, In, Out>
} = internal.taggedWithLabels

/**
 * Creates a timer metric, based on a histogram, which keeps track of
 * durations in milliseconds. The unit of time will automatically be added to
 * the metric as a tag (i.e. `"time_unit: milliseconds"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const timer: (
  name: string
) => Metric<MetricKeyType.MetricKeyType.Histogram, Duration.Duration, MetricState.MetricState.Histogram> =
  internal.timer

/**
 * Creates a timer metric, based on a histogram created from the provided
 * boundaries, which keeps track of durations in milliseconds. The unit of time
 * will automatically be added to the metric as a tag (i.e.
 * `"time_unit: milliseconds"`).
 *
 * @since 1.0.0
 * @category constructors
 */
export const timerWithBoundaries: (
  name: string,
  boundaries: Chunk.Chunk<number>
) => Metric<MetricKeyType.MetricKeyType.Histogram, Duration.Duration, MetricState.MetricState.Histogram> =
  internal.timerWithBoundaries

/**
 * Returns an aspect that will update this metric with the specified constant
 * value every time the aspect is applied to an effect, regardless of whether
 * that effect fails or succeeds.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackAll: {
  <In>(
    input: In
  ): <Type, Out>(self: Metric<Type, In, Out>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <Type, In, Out>(
    self: Metric<Type, In, Out>,
    input: In
  ): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
} = internal.trackAll

/**
 * Returns an aspect that will update this metric with the defects of the
 * effects that it is applied to.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackDefect: {
  <Type, Out>(metric: Metric<Type, unknown, Out>): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A, Type, Out>(self: Effect.Effect<R, E, A>, metric: Metric<Type, unknown, Out>): Effect.Effect<R, E, A>
} = internal.trackDefect

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the defect throwables of the effects that the
 * aspect is applied to.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackDefectWith: {
  <Type, In, Out>(
    metric: Metric<Type, In, Out>,
    f: (defect: unknown) => In
  ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, In, Out>,
    f: (defect: unknown) => In
  ): Effect.Effect<R, E, A>
} = internal.trackDefectWith

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, the input type of the metric
 * must be `Duration`.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackDuration: {
  <Type, Out>(
    metric: Metric<Type, Duration.Duration, Out>
  ): <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A, Type, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, Duration.Duration, Out>
  ): Effect.Effect<R, E, A>
} = internal.trackDuration

/**
 * Returns an aspect that will update this metric with the duration that the
 * effect takes to execute. To call this method, you must supply a function
 * that can convert the `Duration` to the input type of this metric.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackDurationWith: {
  <Type, In, Out>(
    metric: Metric<Type, In, Out>,
    f: (duration: Duration.Duration) => In
  ): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, In, Out>,
    f: (duration: Duration.Duration) => In
  ): Effect.Effect<R, E, A>
} = internal.trackDurationWith

/**
 * Returns an aspect that will update this metric with the failure value of
 * the effects that it is applied to.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackError: {
  <Type, In, Out>(
    metric: Metric<Type, In, Out>
  ): <R, E extends In, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E extends In, A, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, In, Out>
  ): Effect.Effect<R, E, A>
} = internal.trackError

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the error value of the effects that the aspect is
 * applied to.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackErrorWith: {
  <Type, In, Out, In2>(
    metric: Metric<Type, In, Out>,
    f: (error: In2) => In
  ): <R, E extends In2, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E extends In2, A, Type, In, Out, In2>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, In, Out>,
    f: (error: In2) => In
  ): Effect.Effect<R, E, A>
} = internal.trackErrorWith

/**
 * Returns an aspect that will update this metric with the success value of
 * the effects that it is applied to.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackSuccess: {
  <Type, In, Out>(
    metric: Metric<Type, In, Out>
  ): <R, E, A extends In>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A extends In, Type, In, Out>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, In, Out>
  ): Effect.Effect<R, E, A>
} = internal.trackSuccess

/**
 * Returns an aspect that will update this metric with the result of applying
 * the specified function to the success value of the effects that the aspect is
 * applied to.
 *
 * @since 1.0.0
 * @category aspects
 */
export const trackSuccessWith: {
  <Type, In, Out, In2>(
    metric: Metric<Type, In, Out>,
    f: (value: In2) => In
  ): <R, E, A extends In2>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A extends In2, Type, In, Out, In2>(
    self: Effect.Effect<R, E, A>,
    metric: Metric<Type, In, Out>,
    f: (value: In2) => In
  ): Effect.Effect<R, E, A>
} = internal.trackSuccessWith

/**
 * Updates the metric with the specified update message. For example, if the
 * metric were a counter, the update would increment the method by the
 * provided amount.
 *
 * @since 1.0.0
 * @category utils
 */
export const update: {
  <In>(input: In): <Type, Out>(self: Metric<Type, In, Out>) => Effect.Effect<never, never, void>
  <Type, In, Out>(self: Metric<Type, In, Out>, input: In): Effect.Effect<never, never, void>
} = internal.update

/**
 * Retrieves a snapshot of the value of the metric at this moment in time.
 *
 * @since 1.0.0
 * @category getters
 */
export const value: <Type, In, Out>(self: Metric<Type, In, Out>) => Effect.Effect<never, never, Out> = internal.value

/**
 * @since 1.0.0
 * @category utils
 */
export const withNow: <Type, In, Out>(self: Metric<Type, readonly [In, number], Out>) => Metric<Type, In, Out> =
  internal.withNow

/**
 * @since 1.0.0
 * @category zipping
 */
export const zip: {
  <Type2, In2, Out2>(
    that: Metric<Type2, In2, Out2>
  ): <Type, In, Out>(
    self: Metric<Type, In, Out>
  ) => Metric<readonly [Type, Type2], readonly [In, In2], readonly [Out, Out2]>
  <Type, In, Out, Type2, In2, Out2>(
    self: Metric<Type, In, Out>,
    that: Metric<Type2, In2, Out2>
  ): Metric<readonly [Type, Type2], readonly [In, In2], readonly [Out, Out2]>
} = internal.zip

/**
 * Unsafely captures a snapshot of all metrics recorded by the application.
 *
 * @since 1.0.0
 * @category unsafe
 */
export const unsafeSnapshot: (_: void) => HashSet.HashSet<MetricPair.MetricPair.Untyped> = internal.unsafeSnapshot

/**
 * @since 1.0.0
 * @category metrics
 */
export const fiberStarted: Metric.Counter<number> = fiberRuntime.fiberStarted

/**
 * @since 1.0.0
 * @category metrics
 */
export const fiberSuccesses: Metric.Counter<number> = fiberRuntime.fiberSuccesses

/**
 * @since 1.0.0
 * @category metrics
 */
export const fiberFailures: Metric.Counter<number> = fiberRuntime.fiberFailures

/**
 * @since 1.0.0
 * @category metrics
 */
export const fiberLifetimes: Metric<MetricKeyType.MetricKeyType.Histogram, number, MetricState.MetricState.Histogram> =
  fiberRuntime.fiberLifetimes

/**
 * @since 1.0.0
 * @category metrics
 */
export const fiberActive: Metric.Counter<number> = fiberRuntime.fiberActive

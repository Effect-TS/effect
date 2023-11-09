/**
 * @since 2.0.0
 */
import type { Effect } from "../Effect.js"
import type { Fiber } from "../Fiber.js"
import * as internal from "../internal/metric/polling.js"
import type { Metric } from "../Metric.js"
import type { MetricPolling } from "../MetricPolling.js"
import type { Schedule } from "../Schedule.js"
import type { Scope } from "../Scope.js"

/**
 * @since 2.0.0
 * @category symbols
 */
export const PollingMetricTypeId: unique symbol = internal.PollingMetricTypeId

/**
 * @since 2.0.0
 * @category symbols
 */
export type PollingMetricTypeId = typeof PollingMetricTypeId

/**
 * Constructs a new polling metric from a metric and poll effect.
 *
 * @since 2.0.0
 * @category constructors
 */
export const make: <Type, In, Out, R, E>(
  metric: Metric<Type, In, Out>,
  poll: Effect<R, E, In>
) => MetricPolling<Type, In, R, E, Out> = internal.make

/**
 * Collects all of the polling metrics into a single polling metric, which
 * polls for, updates, and produces the outputs of all individual metrics.
 *
 * @since 2.0.0
 * @category constructors
 */
export const collectAll: <R, E, Out>(
  iterable: Iterable<MetricPolling<any, any, R, E, Out>>
) => MetricPolling<Array<any>, Array<any>, R, E, Array<Out>> = internal.collectAll

/**
 * Returns an effect that will launch the polling metric in a background
 * fiber, using the specified schedule.
 *
 * @since 2.0.0
 * @category utils
 */
export const launch: {
  <R2, A2>(
    schedule: Schedule<R2, unknown, A2>
  ): <Type, In, R, E, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => Effect<R2 | R | Scope, never, Fiber<E, A2>>
  <Type, In, R, E, Out, R2, A2>(
    self: MetricPolling<Type, In, R, E, Out>,
    schedule: Schedule<R2, unknown, A2>
  ): Effect<Scope | R | R2, never, Fiber<E, A2>>
} = internal.launch

/**
 * An effect that polls a value that may be fed to the metric.
 *
 * @since 2.0.0
 * @category utils
 */
export const poll: <Type, In, R, E, Out>(self: MetricPolling<Type, In, R, E, Out>) => Effect<R, E, In> = internal.poll

/**
 * An effect that polls for a value and uses the value to update the metric.
 *
 * @since 2.0.0
 * @category utils
 */
export const pollAndUpdate: <Type, In, R, E, Out>(
  self: MetricPolling<Type, In, R, E, Out>
) => Effect<R, E, void> = internal.pollAndUpdate

/**
 * Returns a new polling metric whose poll function will be retried with the
 * specified retry policy.
 *
 * @since 2.0.0
 * @category constructors
 */
export const retry: {
  <R2, E, _>(
    policy: Schedule<R2, E, _>
  ): <Type, In, R, Out>(self: MetricPolling<Type, In, R, E, Out>) => MetricPolling<Type, In, R2 | R, E, Out>
  <Type, In, R, Out, R2, E, _>(
    self: MetricPolling<Type, In, R, E, Out>,
    policy: Schedule<R2, E, _>
  ): MetricPolling<Type, In, R | R2, E, Out>
} = internal.retry

/**
 * Zips this polling metric with the specified polling metric.
 *
 * @since 2.0.0
 * @category utils
 */
export const zip: {
  <Type2, In2, R2, E2, Out2>(
    that: MetricPolling<Type2, In2, R2, E2, Out2>
  ): <Type, In, R, E, Out>(
    self: MetricPolling<Type, In, R, E, Out>
  ) => MetricPolling<
    readonly [Type, Type2], // readonly because invariant
    readonly [In, In2], // readonly because contravariant
    R2 | R,
    E2 | E,
    [Out, Out2]
  >
  <Type, In, R, E, Out, Type2, In2, R2, E2, Out2>(
    self: MetricPolling<Type, In, R, E, Out>,
    that: MetricPolling<Type2, In2, R2, E2, Out2>
  ): MetricPolling<
    readonly [Type, Type2], // readonly because invariant
    readonly [In, In2], // readonly because contravariant
    R | R2,
    E | E2,
    [Out, Out2]
  >
} = internal.zip

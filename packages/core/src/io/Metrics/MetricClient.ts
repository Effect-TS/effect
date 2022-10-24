import type { HashSet } from "@fp-ts/data/HashSet"

/**
 * @tsplus type effect/core/io/Metrics/MetricClient.Ops
 * @category model
 * @since 1.0.0
 */
export interface MetricClientOps {}

/**
 * A `MetricClient` provides the functionality to consume metrics produced by
 * Effect applications. `MetricClient` supports two ways of consuming metrics,
 * corresponding to the two ways that third party metrics services use metrics.
 *
 * First, metrics services can poll for the current state of all recorded
 * metrics using the `unsafeSnapshot` method, which provides a snapshot, as of a
 * point in time, of all metrics recorded by the Effect application.
 *
 * Second, metrics services can install a listener that will be notified every
 * time a metric is updated.
 *
 * `MetricClient` is a lower level interface and is intended to be used by
 * implementers of integrations with third party metrics services but not by end
 * users.
 *
 * @category constructors
 * @since 1.0.0
 */
export const MetricClient: MetricClientOps = {}

/**
 * Unsafely installs the specified metric listener.
 *
 * @tsplus static effect/core/io/Metrics/MetricClient.Ops unsafeInstallListener
 * @category mutations
 * @since 1.0.0
 */
export function unsafeInstallListener(listener: MetricListener): void {
  Metric.registry.installListener(listener)
}

/**
 * Unsafely removes the specified metric listener.
 *
 * @tsplus static effect/core/io/Metrics/MetricClient.Ops unsafeInstallListener
 * @category mutations
 * @since 1.0.0
 */
export function unsafeRemoveListener(listener: MetricListener): void {
  Metric.registry.removeListener(listener)
}

/**
 * Unsafely captures a snapshot of all metrics recorded by the application.
 *
 * @tsplus static effect/core/io/Metrics/MetricClient.Ops unsafeSnapshot
 * @category elements
 * @since 1.0.0
 */
export function unsafeSnapshot(): HashSet<MetricPair.Untyped> {
  return Metric.registry.snapshot()
}

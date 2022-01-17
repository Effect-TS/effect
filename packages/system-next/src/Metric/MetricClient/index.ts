/**
 * A `MetricClient` provides the functionality to consume metrics produced by
 * Effect-TS applications. `MetricClient` supports two ways of consuming
 * metrics, corresponding to the two ways that third party metrics services use
 * metrics.
 *
 * First, metrics services can poll for the current state of all recorded
 * metrics using the `unsafeSnapshot` method, which provides a snapshot, as of a
 * point in time, of all metrics recorded by the Effect-TS application.
 *
 * Second, metrics services can install a listener that will be notified every
 * time a metric is updated.
 *
 * `MetricClient` is a lower level interface and is intended to be used by
 * implementers of integrations with third party metrics services but not by end
 * users.
 */

import * as C from "../../Collections/Immutable/Chunk"
import type { HashMap } from "../../Collections/Immutable/HashMap"
import type { Option } from "../../Option"
import type { Boundaries } from "../Boundaries"
import { ConcurrentState } from "../ConcurrentState"
import type { Counter } from "../Counter"
import type { Gauge } from "../Gauge"
import type { Histogram } from "../Histogram"
import type { MetricKey } from "../MetricKey"
import * as MK from "../MetricKey"
import type { MetricLabel } from "../MetricLabel"
import type { MetricListener } from "../MetricListener"
import type { MetricState } from "../MetricState"
import type { SetCount } from "../SetCount"
import type { Summary } from "../Summary"

export const metricState: ConcurrentState = new ConcurrentState()

/**
 * Unsafely installs the specified metric listener.
 */
export function unsafeInstallListener(listener: MetricListener): void {
  metricState.installListener(listener)
}

/**
 * Unsafely removed the specified metric listener.
 */
export function unsafeRemoveListener(listener: MetricListener): void {
  metricState.removeListener(listener)
}

/**
 * Unsafely captures a snapshot of all metrics recorded by the application.
 */
export function unsafeStates(): HashMap<MetricKey, MetricState> {
  return metricState.states
}

/**
 * Unsafely looks up the state of a metric by its key.
 */
export function unsafeState(key: MetricKey): Option<MetricState> {
  return metricState.state(key)
}

export function unsafeMakeCounter<A>(
  name: string,
  ...tags: Array<MetricLabel>
): Counter<A> {
  return metricState.getCounter(new MK.Counter(name, C.from(tags)))
}

export function unsafeMakeGauge<A>(
  name: string,
  ...tags: Array<MetricLabel>
): Gauge<A> {
  return metricState.getGauge(new MK.Gauge(name, C.from(tags)))
}

export function unsafeMakeHistogram<A>(
  name: string,
  boundaries: Boundaries,
  ...tags: Array<MetricLabel>
): Histogram<A> {
  return metricState.getHistogram(new MK.Histogram(name, boundaries, C.from(tags)))
}

export function unsafeMakeSummary<A>(
  name: string,
  maxAge: Date,
  maxSize: number,
  error: number,
  quantiles: C.Chunk<number>,
  ...tags: Array<MetricLabel>
): Summary<A> {
  return metricState.getSummary(
    new MK.Summary(name, maxAge, maxSize, error, quantiles, C.from(tags))
  )
}

export function unsafeMakeSetCount<A>(
  name: string,
  setTag: string,
  ...tags: Array<MetricLabel>
): SetCount<A> {
  return metricState.getSetCount(new MK.SetCount(name, setTag, C.from(tags)))
}

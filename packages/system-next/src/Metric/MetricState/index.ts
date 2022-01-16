// ets_tracing: off

import * as C from "../../Collections/Immutable/Chunk"
import type { Tuple } from "../../Collections/Immutable/Tuple"
import type { Option } from "../../Option"
import type * as MetricKey from "../MetricKey"
import type { MetricLabel } from "../MetricLabel"
import * as MetricType from "../MetricType"

/**
 * `MetricState` represents a snapshot of the current state of a metric as of a
 * poiint in time.
 */
export class MetricState {
  constructor(
    readonly name: string,
    readonly help: string,
    readonly labels: C.Chunk<MetricLabel>,
    readonly details: MetricType.MetricType
  ) {}

  toString(): string {
    const labels =
      this.labels.length === 0
        ? ""
        : `{${C.join_(
            C.map_(this.labels, (l) => `${l.key}->${l.value}`),
            ","
          )}}`
    return `MetricState(${this.name}${labels}, ${this.details})`
  }
}

/**
 * Constructs a snapshot of the state of a counter.
 */
export function counter(
  key: MetricKey.Counter,
  help: string,
  value: number
): MetricState {
  return new MetricState(key.name, help, key.tags, new MetricType.Counter(value))
}

/**
 * Constructs a snapshot of the state of a gauge.
 */
export function gauge(
  key: MetricKey.Gauge,
  help: string,
  startAt: number
): MetricState {
  return new MetricState(key.name, help, key.tags, new MetricType.Gauge(startAt))
}

/**
 * Constructs a snapshot of the state of a histogram.
 */
export function histogram(
  key: MetricKey.Histogram,
  help: string,
  buckets: C.Chunk<Tuple<[number, number]>>,
  count: number,
  sum: number
): MetricState {
  return new MetricState(
    key.name,
    help,
    key.tags,
    new MetricType.Histogram(buckets, count, sum)
  )
}

/**
 * Constructs a snapshot of the state of a summary.
 */
export function summary(
  key: MetricKey.Summary,
  help: string,
  quantiles: C.Chunk<Tuple<[number, Option<number>]>>,
  count: number,
  sum: number
): MetricState {
  return new MetricState(
    key.name,
    help,
    key.tags,
    new MetricType.Summary(key.error, quantiles, count, sum)
  )
}

/**
 * Constructs a snapshot of the state of a set count..
 */
export function setCount(
  key: MetricKey.SetCount,
  help: string,
  values: C.Chunk<Tuple<[string, number]>>
): MetricState {
  return new MetricState(
    key.name,
    help,
    key.tags,
    new MetricType.SetCount(key.setTag, values)
  )
}

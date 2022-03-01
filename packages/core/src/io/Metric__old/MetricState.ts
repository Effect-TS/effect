import type { Chunk } from "../../collection/immutable/Chunk"
import type { Tuple } from "../../collection/immutable/Tuple"
import type { Option } from "../../data/Option"
import type { MetricKey } from "./MetricKey"
import type { MetricLabel } from "./MetricLabel"
import { MetricType } from "./MetricType"

/**
 * `MetricState` represents a snapshot of the current state of a metric as of a
 * poiint in time.
 */
export class MetricState {
  constructor(
    readonly name: string,
    readonly help: string,
    readonly labels: Chunk<MetricLabel>,
    readonly details: MetricType
  ) {}

  toString(): string {
    const labels =
      this.labels.length === 0
        ? ""
        : `{${this.labels.map((l) => `${l.key}->${l.value}`).join(",")}}`
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
  return new MetricState(key.name, help, key.tags, MetricType.Counter(value))
}

/**
 * Constructs a snapshot of the state of a gauge.
 */
export function gauge(
  key: MetricKey.Gauge,
  help: string,
  startAt: number
): MetricState {
  return new MetricState(key.name, help, key.tags, MetricType.Gauge(startAt))
}

/**
 * Constructs a snapshot of the state of a histogram.
 */
export function histogram(
  key: MetricKey.Histogram,
  help: string,
  buckets: Chunk<Tuple<[number, number]>>,
  count: number,
  sum: number
): MetricState {
  return new MetricState(
    key.name,
    help,
    key.tags,
    MetricType.Histogram(buckets, count, sum)
  )
}

/**
 * Constructs a snapshot of the state of a summary.
 */
export function summary(
  key: MetricKey.Summary,
  help: string,
  quantiles: Chunk<Tuple<[number, Option<number>]>>,
  count: number,
  sum: number
): MetricState {
  return new MetricState(
    key.name,
    help,
    key.tags,
    MetricType.Summary(key.error, quantiles, count, sum)
  )
}

/**
 * Constructs a snapshot of the state of a set count..
 */
export function setCount(
  key: MetricKey.SetCount,
  help: string,
  values: Chunk<Tuple<[string, number]>>
): MetricState {
  return new MetricState(
    key.name,
    help,
    key.tags,
    MetricType.SetCount(key.setTag, values)
  )
}

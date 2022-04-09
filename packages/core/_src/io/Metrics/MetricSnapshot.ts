/**
 * `MetricSnapshot` represents a snapshot of the current state of a metric as
 * of a point in time.
 *
 * @tsplus type ets/MetricState
 */
export interface MetricSnapshot {
  readonly name: string;
  readonly help: string;
  readonly labels: Chunk<MetricLabel>;
  readonly details: MetricType;
}

/**
 * @tsplus type ets/MetricSnapshot/Ops
 */
export interface MetricSnapshotOps {}
export const MetricSnapshot: MetricSnapshotOps = {};

/**
 * `MetricState` represents a snapshot of the current state of a metric as of a
 * poiint in time.
 *
 * @tsplus static ets/MetricState/Ops __call
 */
export function make(
  name: string,
  help: string,
  labels: Chunk<MetricLabel>,
  details: MetricType
): MetricSnapshot {
  return {
    name,
    help,
    labels,
    details
  };
}

/**
 * Constructs a snapshot of the state of a counter.
 *
 * @tsplus static ets/MetricSnapshot/Ops Counter
 */
export function counter(
  key: MetricKey.Counter,
  help: string,
  value: number
): MetricSnapshot {
  return make(key.name, help, key.tags, MetricType.Counter(value));
}

/**
 * Constructs a snapshot of the state of a gauge.
 *
 * @tsplus static ets/MetricSnapshot/Ops Gauge
 */
export function gauge(
  key: MetricKey.Gauge,
  help: string,
  startAt: number
): MetricSnapshot {
  return make(key.name, help, key.tags, MetricType.Gauge(startAt));
}

/**
 * Constructs a snapshot of the state of a histogram.
 *
 * @tsplus static ets/MetricSnapshot/Ops Histogram
 */
export function histogram(
  key: MetricKey.Histogram,
  help: string,
  buckets: Chunk<Tuple<[number, number]>>,
  count: number,
  sum: number
): MetricSnapshot {
  return make(key.name, help, key.tags, MetricType.Histogram(buckets, count, sum));
}

/**
 * Constructs a snapshot of the state of a summary.
 *
 * @tsplus static ets/MetricSnapshot/Ops Summary
 */
export function summary(
  key: MetricKey.Summary,
  help: string,
  quantiles: Chunk<Tuple<[number, Option<number>]>>,
  count: number,
  sum: number
): MetricSnapshot {
  return make(
    key.name,
    help,
    key.tags,
    MetricType.Summary(key.error, quantiles, count, sum)
  );
}

/**
 * Constructs a snapshot of the state of a set count.
 *
 * @tsplus static ets/MetricSnapshot/Ops SetCount
 */
export function setCount(
  key: MetricKey.SetCount,
  help: string,
  values: Chunk<Tuple<[string, number]>>
): MetricSnapshot {
  return make(key.name, help, key.tags, MetricType.SetCount(key.setTag, values));
}

export function print(self: MetricSnapshot): string {
  const labels = self.labels.length === 0
    ? ""
    : `{${self.labels.map((l) => `${l.key}->${l.value}`).join(",")}}`;
  return `MetricState(${self.name}${labels}, ${self.details})`;
}

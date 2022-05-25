export const MetricKeySym = Symbol.for("@effect/core/io/Metric/MetricKey")
export type MetricKeySym = typeof MetricKeySym

/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and tags associated with the
 * metric, and any other information to describe a a metric, such as the
 * boundaries of a histogram. In this way, it is impossible to ever create
 * different metrics with conflicting keys.
 *
 * @tsplus type ets/Metrics/MetricKey
 * @tsplus companion ets/Metrics/MetricKey/Ops
 */
export class MetricKey<Type> implements Equals {
  readonly [MetricKeySym]: MetricKeySym = MetricKeySym

  constructor(
    readonly name: string,
    readonly keyType: Type,
    readonly tags: HashSet<MetricLabel> = HashSet.empty()
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this.name),
      Hash.combine(Hash.unknown(this.keyType), Hash.unknown(this.tags))
    )
  }

  [Equals.sym](u: unknown): boolean {
    return isMetricKey(u) &&
      this.name === u.name &&
      Hash.unknown(this.keyType) === Hash.unknown(u.keyType) &&
      this.tags == u.tags
  }
}

export declare namespace MetricKey {
  export type Untyped = MetricKey<unknown>

  export type Counter = MetricKey<MetricKeyType.Counter>
  export type Gauge = MetricKey<MetricKeyType.Gauge>
  export type Frequency = MetricKey<MetricKeyType.Frequency>
  export type Histogram = MetricKey<MetricKeyType.Histogram>
  export type Summary = MetricKey<MetricKeyType.Summary>
}

/**
 * Creates a metric key for a counter, with the specified name.
 *
 * @tsplus static ets/Metrics/MetricKey/Ops Counter
 */
export function counter(name: string): MetricKey.Counter {
  return new MetricKey(name, MetricKeyType.Counter)
}

/**
 * Creates a metric key for a gauge, with the specified name.
 *
 * @tsplus static ets/Metrics/MetricKey/Ops Gauge
 */
export function gauge(name: string): MetricKey.Gauge {
  return new MetricKey(name, MetricKeyType.Gauge)
}

/**
 * Creates a metric key for a categorical frequency table, with the specified
 * name.
 *
 * @tsplus static ets/Metrics/MetricKey/Ops Frequency
 */
export function frequency(name: string): MetricKey.Frequency {
  return new MetricKey(name, MetricKeyType.Frequency)
}

/**
 * Creates a metric key for a histogram, with the specified name and boundaries.
 *
 * @tsplus static ets/Metrics/MetricKey/Ops Histogram
 */
export function histogram(name: string, boundaries: Metric.Histogram.Boundaries): MetricKey.Histogram {
  return new MetricKey(name, MetricKeyType.Histogram(boundaries))
}

/**
 * Creates a metric key for a histogram, with the specified name, maxAge,
 * maxSize, error, and quantiles.
 *
 * @tsplus static ets/Metrics/MetricKey/Ops Summary
 */
export function summary(
  name: string,
  maxAge: Duration,
  maxSize: number,
  error: number,
  quantiles: Chunk<number>
): MetricKey.Summary {
  return new MetricKey(name, MetricKeyType.Summary(maxAge, maxSize, error, quantiles))
}

/**
 * Returns a new `MetricKey` with the specified tag appended.
 *
 * @tsplus fluent ets/Metrics/MetricKey tagged
 */
export function tagged<Type>(self: MetricKey<Type>, key: string, value: string): MetricKey<Type> {
  return self.taggedWithLabelSet(HashSet(MetricLabel(key, value)))
}

/**
 * Returns a new `MetricKey` with the specified tags appended.
 *
 * @tsplus fluent ets/Metrics/MetricKey taggedWithLabels
 */
export function taggedWithLabels<Type>(self: MetricKey<Type>, extraTags: Collection<MetricLabel>): MetricKey<Type> {
  return self.taggedWithLabelSet(HashSet.from(extraTags))
}

/**
 * Returns a new `MetricKey` with the specified tags appended.
 *
 * @tsplus fluent ets/Metrics/MetricKey taggedWithLabelSet
 */
export function taggedWithLabelSet<Type>(self: MetricKey<Type>, extraTags: HashSet<MetricLabel>): MetricKey<Type> {
  return extraTags.size === 0 ? self : new MetricKey(self.name, self.keyType, self.tags.union(extraTags))
}

/**
 * @tsplus static ets/Metrics/MetricKey/Ops isMetricKey
 */
export function isMetricKey(u: unknown): u is MetricKey<unknown> {
  return typeof u === "object" && u != null && MetricKeySym in u
}

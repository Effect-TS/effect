export const MetricKeySym = Symbol.for("@effect/core/io/Metrics/MetricKey");
export type MetricKeySym = typeof MetricKeySym;

/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and labels associated with the
 * metric, and any other information to describe a a metric, such as the
 * boundaries of a histogram. In this way, it is impossible to ever create
 * metrics with conflicting keys.
 *
 * @tsplus type ets/MetricKey
 */
export type MetricKey = CounterKey | GaugeKey | HistogramKey | SummaryKey | SetCountKey;

export declare namespace MetricKey {
  type Counter = CounterKey;
  type Gauge = GaugeKey;
  type Histogram = HistogramKey;
  type Summary = SummaryKey;
  type SetCount = SetCountKey;
}

/**
 * @tsplus type ets/MetricKey/Ops
 */
export interface MetricKeyOps {}
export const MetricKey: MetricKeyOps = {};

/**
 * @tsplus type ets/MetricKey/Counter
 */
export class CounterKey implements Equals {
  readonly _tag = "CounterKey";
  readonly [MetricKeySym] = MetricKeySym;

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(Hash.string(this.name), Hash.unknown(this.tags))
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "CounterKey" &&
      this.name === that.name &&
      this.tags == that.tags
    );
  }
}

/**
 * @tsplus type ets/MetricKey/Gauge
 */
export class GaugeKey implements Equals {
  readonly _tag = "GaugeKey";
  readonly [MetricKeySym] = MetricKeySym;

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(Hash.string(this.name), Hash.unknown(this.tags))
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "GaugeKey" &&
      this.tags == that.tags
    );
  }
}

/**
 * @tsplus type ets/MetricKey/Histogram
 */
export class HistogramKey implements Equals {
  readonly _tag = "HistogramKey";
  readonly [MetricKeySym] = MetricKeySym;

  constructor(
    readonly name: string,
    readonly boundaries: Boundaries,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.combine(Hash.string(this._tag), Hash.string(this.name)),
      Hash.combine(Hash.unknown(this.boundaries), Hash.unknown(this.tags))
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "HistogramKey" &&
      this.name === that.name &&
      this.boundaries == that.boundaries &&
      this.tags == that.tags
    );
  }
}

/**
 * @tsplus type ets/MetricKey/Summary
 */
export class SummaryKey implements Equals {
  readonly _tag = "SummaryKey";
  readonly [MetricKeySym] = MetricKeySym;

  constructor(
    readonly name: string,
    readonly maxSize: number,
    readonly maxAge: Duration,
    readonly error: number,
    readonly quantiles: Chunk<number>,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.string(this.name),
        Hash.combine(
          Hash.number(this.maxSize),
          Hash.combine(
            Hash.unknown(this.maxAge),
            Hash.combine(
              Hash.number(this.error),
              Hash.combine(Hash.unknown(this.quantiles), Hash.unknown(this.tags))
            )
          )
        )
      )
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "SummaryKey" &&
      this.name === that.name &&
      this.maxSize === that.maxSize &&
      this.maxAge == that.maxAge &&
      this.error === that.error &&
      this.quantiles == that.quantiles &&
      this.tags == that.tags
    );
  }
}

/**
 * @tsplus type ets/MetricKey/SetCount
 */
export class SetCountKey implements Equals {
  readonly _tag = "SetCountKey";
  readonly [MetricKeySym] = MetricKeySym;

  constructor(
    readonly name: string,
    readonly setTag: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  counterKey(word: string): CounterKey {
    return new CounterKey(
      this.name,
      this.tags.prepend(new MetricLabel(this.setTag, word))
    );
  }

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.string(this.name),
        Hash.combine(Hash.string(this.setTag), Hash.unknown(this.tags))
      )
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "SetCountKey" &&
      this.name === that.name &&
      this.setTag === that.setTag &&
      this.tags == that.tags
    );
  }
}

/**
 * @tsplus static ets/MetricKey/Ops Counter
 */
export function counter(
  name: string,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Counter {
  return new CounterKey(name, tags);
}

/**
 * @tsplus static ets/MetricKey/Ops Gauge
 */
export function gauge(
  name: string,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Gauge {
  return new GaugeKey(name, tags);
}

/**
 * @tsplus static ets/MetricKey/Ops Histogram
 */
export function histogram(
  name: string,
  boundaries: Boundaries,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Histogram {
  return new HistogramKey(name, boundaries, tags);
}

/**
 * @tsplus static ets/MetricKey/Ops Summary
 */
export function summary(
  name: string,
  maxSize: number,
  maxAge: Duration,
  error: number,
  quantiles: Chunk<number>,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Summary {
  return new SummaryKey(name, maxSize, maxAge, error, quantiles, tags);
}

/**
 * @tsplus static ets/MetricKey/Ops SetCount
 */
export function setCount(
  name: string,
  setTag: string,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.SetCount {
  return new SetCountKey(name, setTag, tags);
}

/**
 * @tsplus static ets/MetricKey/Ops isMetricKey
 */
export function isMetricKey(u: unknown): u is MetricKey {
  return typeof u === "object" && u != null && MetricKeySym in u;
}

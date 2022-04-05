export const MetricTypeSym = Symbol.for("@effect-ts/core/io/Metrics/MetricType");
export type MetricTypeSym = typeof MetricTypeSym;

/**
 * `MetricType` represents information about the state of a metric that is
 * particular to a certain type of metric, such as a histogram as opposed to a
 * counter.
 *
 * @tsplus type ets/MetricType
 */
export type MetricType =
  | CounterType
  | GaugeType
  | HistogramType
  | SummaryType
  | SetCountType;

export declare namespace MetricType {
  type Counter = CounterType;
  type Gauge = GaugeType;
  type Histogram = HistogramType;
  type Summary = SummaryType;
  type SetCount = SetCountType;
}

/**
 * @tsplus type ets/MetricType/Ops
 */
export interface MetricTypeOps {}
export const MetricType: MetricTypeOps = {};

export class CounterType implements Equals {
  readonly _tag = "CounterType";

  constructor(readonly count: number) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.count));
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "CounterType" &&
      Hash.unknown(this) === Hash.unknown(that)
    );
  }

  toString(): string {
    return `Counter(${this.count})`;
  }
}

export class GaugeType implements Equals {
  readonly _tag = "GaugeType";

  constructor(readonly value: number) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.value));
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricType(that) && that._tag === "GaugeType" && Hash.unknown(this) === Hash.unknown(that)
    );
  }

  toString(): string {
    return `Gauge(${this.value})`;
  }
}

export class HistogramType implements Equals {
  readonly _tag = "HistogramType";

  constructor(
    readonly buckets: Chunk<Tuple<[number, number]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.unknown(this.buckets),
        Hash.combine(Hash.number(this.count), Hash.number(this.sum))
      )
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "HistogramType" &&
      Hash.unknown(this) === Hash.unknown(that)
    );
  }

  toString(): string {
    const buckets = this.buckets
      .map(({ tuple: [start, end] }) => `[${start},${end}]`)
      .join(",");
    return `Histogram(${buckets}, ${this.count}, ${this.sum})`;
  }
}

export class SummaryType implements Equals {
  readonly _tag = "SummaryType";

  constructor(
    readonly error: number,
    readonly quantiles: Chunk<Tuple<[number, Option<number>]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(
        Hash.number(this.error),
        Hash.combine(
          Hash.unknown(this.quantiles),
          Hash.combine(Hash.number(this.count), Hash.number(this.sum))
        )
      )
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "HistogramType" &&
      Hash.unknown(this) === Hash.unknown(that)
    );
  }

  toString(): string {
    const quantiles = this.quantiles
      .map(({ tuple: [start, end] }) => `[${start},${end.getOrElse("")}]`)
      .join(",");
    return `Summary(${this.error}, ${quantiles}, ${this.count}, ${this.sum})`;
  }
}

export class SetCountType implements Equals {
  readonly _tag = "SetCountType";

  constructor(
    readonly setTag: string,
    readonly occurrences: Chunk<Tuple<[string, number]>>
  ) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string(this._tag),
      Hash.combine(Hash.string(this.setTag), Hash.unknown(this.occurrences))
    );
  }

  [Equals.sym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "HistogramType" &&
      Hash.unknown(this) === Hash.unknown(that)
    );
  }

  toString(): string {
    const occurrences = this.occurrences
      .map(({ tuple: [name, count] }) => `{${name}:${count}}`)
      .join(",");
    return `SetCount(${this.setTag}, ${occurrences})`;
  }
}

/**
 * @tsplus static ets/MetricType/Ops Counter
 */
export function counter(count: number): MetricType {
  return new CounterType(count);
}

/**
 * @tsplus static ets/MetricType/Ops Gauge
 */
export function gauge(value: number): MetricType {
  return new GaugeType(value);
}

/**
 * @tsplus static ets/MetricType/Ops Histogram
 */
export function histogram(
  buckets: Chunk<Tuple<[number, number]>>,
  count: number,
  sum: number
): MetricType {
  return new HistogramType(buckets, count, sum);
}

/**
 * @tsplus static ets/MetricType/Ops Summary
 */
export function summary(
  error: number,
  quantiles: Chunk<Tuple<[number, Option<number>]>>,
  count: number,
  sum: number
): MetricType {
  return new SummaryType(error, quantiles, count, sum);
}

/**
 * @tsplus static ets/MetricType/Ops SetCount
 */
export function setCount(
  setTag: string,
  occurrences: Chunk<Tuple<[string, number]>>
): MetricType {
  return new SetCountType(setTag, occurrences);
}

/**
 * @tsplus static ets/MetricType/Ops isMetricType
 */
export function isMetricType(u: unknown): u is MetricType {
  return typeof u === "object" && u != null && MetricTypeSym in u;
}

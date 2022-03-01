import type { Chunk } from "../../collection/immutable/Chunk"
import type { Tuple } from "../../collection/immutable/Tuple"
import type { Option } from "../../data/Option"
import * as St from "../../prelude/Structural"

export const MetricTypeSym = Symbol.for("@effect-ts/core/io/Metrics/MetricType")
export type MetricTypeSym = typeof MetricTypeSym

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
  | SetCountType

export declare namespace MetricType {
  type Counter = CounterType
  type Gauge = GaugeType
  type Histogram = HistogramType
  type Summary = SummaryType
  type SetCount = SetCountType
}

/**
 * @tsplus type ets/MetricTypeOps
 */
export interface MetricTypeOps {}
export const MetricType: MetricTypeOps = {}

export class CounterType implements St.HasHash, St.HasEquals {
  readonly _tag = "CounterType"

  constructor(readonly count: number) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hashNumber(this.count))
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "CounterType" &&
      St.hash(this) === St.hash(that)
    )
  }

  toString(): string {
    return `Counter(${this.count})`
  }
}

export class GaugeType implements St.HasHash, St.HasEquals {
  readonly _tag = "GaugeType"

  constructor(readonly value: number) {}

  get [St.hashSym](): number {
    return St.combineHash(St.hashString(this._tag), St.hashNumber(this.value))
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricType(that) && that._tag === "GaugeType" && St.hash(this) === St.hash(that)
    )
  }

  toString(): string {
    return `Gauge(${this.value})`
  }
}

export class HistogramType implements St.HasHash, St.HasEquals {
  readonly _tag = "HistogramType"

  constructor(
    readonly buckets: Chunk<Tuple<[number, number]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hash(this.buckets),
        St.combineHash(St.hashNumber(this.count), St.hashNumber(this.sum))
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "HistogramType" &&
      St.hash(this) === St.hash(that)
    )
  }

  toString(): string {
    const buckets = this.buckets
      .map(({ tuple: [start, end] }) => `[${start},${end}]`)
      .join(",")
    return `Histogram(${buckets}, ${this.count}, ${this.sum})`
  }
}

export class SummaryType implements St.HasHash, St.HasEquals {
  readonly _tag = "SummaryType"

  constructor(
    readonly error: number,
    readonly quantiles: Chunk<Tuple<[number, Option<number>]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashNumber(this.error),
        St.combineHash(
          St.hash(this.quantiles),
          St.combineHash(St.hashNumber(this.count), St.hashNumber(this.sum))
        )
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "HistogramType" &&
      St.hash(this) === St.hash(that)
    )
  }

  toString(): string {
    const quantiles = this.quantiles
      .map(({ tuple: [start, end] }) => `[${start},${end.getOrElse("")}]`)
      .join(",")
    return `Summary(${this.error}, ${quantiles}, ${this.count}, ${this.sum})`
  }
}

export class SetCountType implements St.HasHash, St.HasEquals {
  readonly _tag = "SetCountType"

  constructor(
    readonly setTag: string,
    readonly occurrences: Chunk<Tuple<[string, number]>>
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(St.hashString(this.setTag), St.hash(this.occurrences))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricType(that) &&
      that._tag === "HistogramType" &&
      St.hash(this) === St.hash(that)
    )
  }

  toString(): string {
    const occurrences = this.occurrences
      .map(({ tuple: [name, count] }) => `{${name}:${count}}`)
      .join(",")
    return `SetCount(${this.setTag}, ${occurrences})`
  }
}

/**
 * @tsplus static ets/MetricTypeOps Counter
 */
export function counter(count: number): MetricType {
  return new CounterType(count)
}

/**
 * @tsplus static ets/MetricTypeOps Gauge
 */
export function gauge(value: number): MetricType {
  return new GaugeType(value)
}

/**
 * @tsplus static ets/MetricTypeOps Histogram
 */
export function histogram(
  buckets: Chunk<Tuple<[number, number]>>,
  count: number,
  sum: number
): MetricType {
  return new HistogramType(buckets, count, sum)
}

/**
 * @tsplus static ets/MetricTypeOps Summary
 */
export function summary(
  error: number,
  quantiles: Chunk<Tuple<[number, Option<number>]>>,
  count: number,
  sum: number
): MetricType {
  return new SummaryType(error, quantiles, count, sum)
}

/**
 * @tsplus static ets/MetricTypeOps SetCount
 */
export function setCount(
  setTag: string,
  occurrences: Chunk<Tuple<[string, number]>>
): MetricType {
  return new SetCountType(setTag, occurrences)
}

/**
 * @tsplus static ets/MetricTypeOps isMetricType
 */
export function isMetricType(u: unknown): u is MetricType {
  return typeof u === "object" && u != null && MetricTypeSym in u
}

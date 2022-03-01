import { Chunk } from "../../collection/immutable/Chunk"
import * as St from "../../prelude/Structural"
import type { Boundaries } from "./Boundaries"
import { MetricLabel } from "./MetricLabel"

export const MetricKeySym = Symbol.for("@effect-ts/core/io/Metrics/MetricKey")
export type MetricKeySym = typeof MetricKeySym

/**
 * A `MetricKey` is a unique key associated with each metric. The key is based
 * on a combination of the metric type, the name and labels associated with the
 * metric, and any other information to describe a a metric, such as the
 * boundaries of a histogram. In this way, it is impossible to ever create
 * metrics with conflicting keys.
 *
 * @tsplus type ets/MetricKey
 */
export type MetricKey = CounterKey | GaugeKey | HistogramKey | SummaryKey | SetCountKey

export declare namespace MetricKey {
  type Counter = CounterKey
  type Gauge = GaugeKey
  type Histogram = HistogramKey
  type Summary = SummaryKey
  type SetCount = SetCountKey
}

/**
 * @tsplus type ets/MetricKeyOps
 */
export interface MetricKeyOps {}
export const MetricKey: MetricKeyOps = {}

export class CounterKey implements St.HasHash, St.HasEquals {
  readonly _tag = "CounterKey";
  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(St.hashString(this._tag), St.hash(this.tags))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricKey(that) && that._tag === "CounterKey" && St.hash(this) === St.hash(that)
    )
  }
}

export class GaugeKey implements St.HasHash, St.HasEquals {
  readonly _tag = "GaugeKey";
  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this.name),
      St.combineHash(St.hashString(this._tag), St.hash(this.tags))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricKey(that) && that._tag === "GaugeKey" && St.hash(this) === St.hash(that)
    )
  }
}

export class HistogramKey implements St.HasHash, St.HasEquals {
  readonly _tag = "HistogramKey";
  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly boundaries: Boundaries,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.combineHash(St.hashString(this._tag), St.hashString(this.name)),
      St.combineHash(St.hash(this.boundaries), St.hash(this.tags))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "HistogramKey" &&
      St.hash(this) === St.hash(that)
    )
  }
}

export class SummaryKey implements St.HasHash, St.HasEquals {
  readonly _tag = "SummaryKey";
  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly maxAge: Date,
    readonly maxSize: number,
    readonly error: number,
    readonly quantiles: Chunk<number>,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashString(this.name),
        St.combineHash(
          St.hashObject(this.maxAge),
          St.combineHash(
            St.hashNumber(this.maxSize),
            St.combineHash(
              St.hashNumber(this.error),
              St.combineHash(St.hash(this.quantiles), St.hash(this.tags))
            )
          )
        )
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "HistogramKey" &&
      St.hash(this) === St.hash(that)
    )
  }
}

export class SetCountKey implements St.HasHash, St.HasEquals {
  readonly _tag = "SetCountKey";
  readonly [MetricKeySym] = MetricKeySym

  constructor(
    readonly name: string,
    readonly setTag: string,
    readonly tags: Chunk<MetricLabel> = Chunk.empty()
  ) {}

  counterKey(word: string): CounterKey {
    return new CounterKey(
      this.name,
      this.tags.prepend(new MetricLabel(this.setTag, word))
    )
  }

  get [St.hashSym](): number {
    return St.combineHash(
      St.hashString(this._tag),
      St.combineHash(
        St.hashString(this.name),
        St.combineHash(St.hashString(this.setTag), St.hash(this.tags))
      )
    )
  }

  [St.equalsSym](that: unknown): boolean {
    return (
      isMetricKey(that) &&
      that._tag === "SetCountKey" &&
      St.hash(this) === St.hash(that)
    )
  }
}

/**
 * @tsplus static ets/MetricKeyOps Counter
 */
export function counter(
  name: string,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Counter {
  return new CounterKey(name, tags)
}

/**
 * @tsplus static ets/MetricKeyOps Gauge
 */
export function gauge(
  name: string,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Gauge {
  return new GaugeKey(name, tags)
}

/**
 * @tsplus static ets/MetricKeyOps Histogram
 */
export function histogram(
  name: string,
  boundaries: Boundaries,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Histogram {
  return new HistogramKey(name, boundaries, tags)
}

/**
 * @tsplus static ets/MetricKeyOps Summary
 */
export function summary(
  name: string,
  maxAge: Date,
  maxSize: number,
  error: number,
  quantiles: Chunk<number>,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.Summary {
  return new SummaryKey(name, maxAge, maxSize, error, quantiles, tags)
}

/**
 * @tsplus static ets/MetricKeyOps SetCount
 */
export function setCount(
  name: string,
  setTag: string,
  tags: Chunk<MetricLabel> = Chunk.empty()
): MetricKey.SetCount {
  return new SetCountKey(name, setTag, tags)
}

/**
 * @tsplus static ets/MetricKeyOps isMetricKey
 */
export function isMetricKey(u: unknown): u is MetricKey {
  return typeof u === "object" && u != null && MetricKeySym in u
}

import type { Chunk } from "../../collection/immutable/Chunk"
import type { Tuple } from "../../collection/immutable/Tuple"
import type { Option } from "../../data/Option"

/**
 * `MetricType` represents information about the state of a metric that is
 * particular to a certain type of metric, such as a histogram as opposed to a
 * counter.
 */
export type MetricType = Counter | Gauge | Histogram | Summary | SetCount

export class Counter {
  readonly _tag = "Counter"

  constructor(readonly count: number) {}

  toString(): string {
    return `Counter(${this.count})`
  }
}

export class Gauge {
  readonly _tag = "Gauge"

  constructor(readonly value: number) {}

  toString(): string {
    return `Gauge(${this.value})`
  }
}

export class Histogram {
  readonly _tag = "Histogram"

  constructor(
    readonly buckets: Chunk<Tuple<[number, number]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  toString(): string {
    const buckets = this.buckets
      .map(({ tuple: [start, end] }) => `[${start},${end}]`)
      .join(",")
    return `Histogram(${buckets}, ${this.count}, ${this.sum})`
  }
}

export class Summary {
  readonly _tag = "Summar"

  constructor(
    readonly error: number,
    readonly quantiles: Chunk<Tuple<[number, Option<number>]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  toString(): string {
    const quantiles = this.quantiles
      .map(({ tuple: [start, end] }) => `[${start},${end.getOrElse("")}]`)
      .join(",")
    return `Summary(${this.error}, ${quantiles}, ${this.count}, ${this.sum})`
  }
}

export class SetCount {
  readonly _tag = "SetCount"

  constructor(
    readonly setTag: string,
    readonly occurrences: Chunk<Tuple<[string, number]>>
  ) {}

  toString(): string {
    const occurrences = this.occurrences
      .map(({ tuple: [name, count] }) => `{${name}:${count}}`)
      .join(",")
    return `SetCount(${this.setTag}, ${occurrences})`
  }
}

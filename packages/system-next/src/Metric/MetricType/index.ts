// ets_tracing: off

import * as C from "../../Collections/Immutable/Chunk"
import type { Tuple } from "../../Collections/Immutable/Tuple"
import * as O from "../../Option"

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
    readonly buckets: C.Chunk<Tuple<[number, number]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  toString(): string {
    const buckets = C.join_(
      C.map_(this.buckets, ({ tuple: [start, end] }) => `[${start},${end}]`),
      ","
    )
    return `Histogram(${buckets}, ${this.count}, ${this.sum})`
  }
}

export class Summary {
  readonly _tag = "Summar"

  constructor(
    readonly error: number,
    readonly quantiles: C.Chunk<Tuple<[number, O.Option<number>]>>,
    readonly count: number,
    readonly sum: number
  ) {}

  toString(): string {
    const quantiles = C.join_(
      C.map_(
        this.quantiles,
        ({ tuple: [start, end] }) => `[${start},${O.getOrElse_(end, () => "")}]`
      ),
      ","
    )
    return `Summary(${this.error}, ${quantiles}, ${this.count}, ${this.sum})`
  }
}

export class SetCount {
  readonly _tag = "SetCount"

  constructor(
    readonly setTag: string,
    readonly occurrences: C.Chunk<Tuple<[string, number]>>
  ) {}

  toString(): string {
    const occurrences = C.join_(
      C.map_(this.occurrences, ({ tuple: [name, count] }) => `{${name}:${count}}`),
      ","
    )
    return `SetCount(${this.setTag}, ${occurrences})`
  }
}

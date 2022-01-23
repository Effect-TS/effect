import type { Tuple } from "../Collections/Immutable/Tuple"
import type { ConcurrentCounter } from "./ConcurrentCounter"
import type { ConcurrentGauge } from "./ConcurrentGauge"
import type { ConcurrentHistogram } from "./ConcurrentHistogram"
import type { ConcurrentSetCount } from "./ConcurrentSetCount"
import type { ConcurrentSummary } from "./ConcurrentSummary"
import type * as MetricKey from "./MetricKey"
import * as MetricState from "./MetricState"

export type ConcurrentMetricState = Counter | Gauge | Histogram | Summary | SetCount

export class Counter {
  readonly _tag = "Counter"

  constructor(
    readonly key: MetricKey.Counter,
    readonly help: string,
    readonly counter: ConcurrentCounter
  ) {}

  get count(): number {
    return this.counter.count
  }

  increment(v: number): Tuple<[number, number]> {
    return this.counter.increment(v)
  }
}

export class Gauge {
  readonly _tag = "Gauge"

  constructor(
    readonly key: MetricKey.Gauge,
    readonly help: string,
    readonly gauge: ConcurrentGauge
  ) {}

  get get(): number {
    return this.gauge.get
  }

  set(v: number): Tuple<[number, number]> {
    return this.gauge.set(v)
  }

  adjust(v: number): Tuple<[number, number]> {
    return this.gauge.adjust(v)
  }
}

export class Histogram {
  readonly _tag = "Histogram"

  constructor(
    readonly key: MetricKey.Histogram,
    readonly help: string,
    readonly histogram: ConcurrentHistogram
  ) {}

  observe(value: number): void {
    return this.histogram.observe(value)
  }
}

export class Summary {
  readonly _tag = "Summary"

  constructor(
    readonly key: MetricKey.Summary,
    readonly help: string,
    readonly summary: ConcurrentSummary
  ) {}

  observe(value: number, time: Date): void {
    return this.summary.observe(value, time)
  }
}

export class SetCount {
  readonly _tag = "SetCount"

  constructor(
    readonly key: MetricKey.SetCount,
    readonly help: string,
    readonly setCount: ConcurrentSetCount
  ) {}

  observe(word: string): void {
    return this.setCount.observe(word)
  }
}

export function toMetricState(self: ConcurrentMetricState): MetricState.MetricState {
  switch (self._tag) {
    case "Counter": {
      return MetricState.counter(self.key, self.help, self.counter.count)
    }
    case "Gauge": {
      return MetricState.gauge(self.key, self.help, self.gauge.get)
    }
    case "Histogram": {
      return MetricState.histogram(
        self.key,
        self.help,
        self.histogram.snapshot(),
        self.histogram.getCount(),
        self.histogram.getSum()
      )
    }
    case "Summary": {
      return MetricState.summary(
        self.key,
        self.help,
        self.summary.snapshot(new Date()),
        self.summary.getCount(),
        self.summary.getSum()
      )
    }
    case "SetCount": {
      return MetricState.setCount(self.key, self.help, self.setCount.snapshot())
    }
  }
}

import { Chunk } from "../../collection/immutable/Chunk"
import { Tuple } from "../../collection/immutable/Tuple"
import { Duration } from "../../data/Duration"
import { Option } from "../../data/Option"
import { IO } from "../../io-light/IO"
import { AtomicNumber } from "../../support/AtomicNumber"
import type { MetricKey } from "./MetricKey"
import { MetricSnapshot } from "./MetricSnapshot"

/**
 * @tsplus type ets/MetricState
 */
export type MetricState =
  | CounterState
  | GaugeState
  | HistogramState
  | SummaryState
  | SetCountState

export declare namespace MetricState {
  type Counter = CounterState
  type Gauge = GaugeState
  type Histogram = HistogramState
  type Summary = SummaryState
  type SetCount = SetCountState
}

/**
 * @tsplus type ets/MetricStateOps
 */
export interface MetricStateOps {}
export const MetricState: MetricStateOps = {}

export class CounterState {
  readonly _tag = "Counter"

  #value: number

  constructor(readonly key: MetricKey.Counter, readonly help: string) {
    this.#value = 0
  }

  get count(): number {
    return this.#value
  }

  increment(value: number): Tuple<[number, number]> {
    this.#value = this.#value + value
    return Tuple(this.#value, value)
  }
}

export class GaugeState {
  readonly _tag = "Gauge"

  #value: AtomicNumber

  constructor(readonly key: MetricKey.Gauge, readonly help: string, startAt: number) {
    this.#value = new AtomicNumber(startAt)
  }

  get get(): number {
    return this.#value.get
  }

  set(value: number): Tuple<[number, number]> {
    const old = this.#value.getAndSet(value)
    return Tuple(value, value - old)
  }

  adjust(value: number): Tuple<[number, number]> {
    this.#value.set(this.get + value)
    return Tuple(this.get, value)
  }
}

export class HistogramState {
  readonly _tag = "Histogram"

  #count = 0
  #sum = 0
  #size: number
  #boundaries: Array<number>
  #values: Array<number>

  constructor(readonly key: MetricKey.Histogram, readonly help: string) {
    const bounds = key.boundaries.chunk

    this.#boundaries = Array(bounds.length)
    this.#size = bounds.length
    this.#values = Array.from({ length: bounds.length + 1 }, () => 0)

    const _ = bounds.toArray() as Array<number>
    _.sort().forEach((n, i) => {
      this.#boundaries[i] = n
    })
  }

  getCount(): number {
    return this.#count
  }

  getSum(): number {
    return this.#sum
  }

  // Insert the value into the correct bucket using a binary search
  observe(value: number): void {
    let from = 0
    let to = this.#size
    while (from !== to) {
      const mid = Math.floor(from + (to - from) / 2)
      const boundary = this.#boundaries[mid]!

      if (value <= boundary) {
        to = mid
      } else {
        from = mid
      }

      // The special case when to / from have a distance of one
      if (to === from + 1) {
        if (value <= this.#boundaries[from]!) {
          to = from
        } else {
          from = to
        }
      }
    }
    this.#values[from] = this.#values[from]! + 1
    this.#count = this.#count + 1
    this.#sum = this.#sum + value
  }

  snapshot(): Chunk<Tuple<[number, number]>> {
    const builder = Chunk.builder<Tuple<[number, number]>>()
    let i = 0
    let cumulated = 0
    while (i !== this.#size) {
      const boundary = this.#boundaries[i]!
      const value = this.#values[i]!
      cumulated = cumulated + value
      builder.append(Tuple(boundary, cumulated))
      i = i + 1
    }
    return builder.build()
  }
}

export class SummaryState {
  readonly _tag = "Summary"

  #head = 0
  #count = 0
  #sum = 0
  #values: Array<Tuple<[number, number]>>
  #sortedQuantiles: Chunk<number>

  constructor(readonly key: MetricKey.Summary, readonly help: string) {
    this.#values = new Array(this.key.maxSize)
    this.#sortedQuantiles = Chunk.from(
      (key.quantiles.toArray() as Array<number>).sort()
    )
  }

  getCount(): number {
    return this.#count
  }

  getSum(): number {
    return this.#sum
  }

  // Just before the Snapshot we filter out all values older than maxAge
  snapshot(now: number): Chunk<Tuple<[number, Option<number>]>> {
    const result: Array<number> = []

    // If the buffer is not full yet it contains valid items at the 0..last
    // indices and null values at the rest of the positions.
    //
    // If the buffer is already full then all elements contains a valid
    // measurement with timestamp.
    //
    // At any given point in time we can enumerate all the non-null elements in
    // the buffer and filter them by timestamp to get a valid view of a time
    // window.
    //
    // The order does not matter because it gets sorted before passing to
    // `calculateQuantiles`.

    let i = 0
    while (i !== this.key.maxSize - 1) {
      const item = this.#values[i]
      if (item != null) {
        const {
          tuple: [t, v]
        } = item
        const age = Duration(now - t)
        if (age.milliseconds >= 0 && age.milliseconds <= 0) {
          result.push(v)
        }
      }
      i = i + 1
    }

    return calculateQuantiles(
      Chunk.from(result.sort()),
      this.key.error,
      this.#sortedQuantiles
    )
  }

  // Assuming that the instant of observed values is continuously increasing,
  // while observing we cut off the first sample if we have already `maxSize`
  // samples
  observe(value: number, timestamp: number): void {
    if (this.key.maxSize > 0) {
      this.#head = this.#head + 1
      const target = this.#head % this.key.maxSize
      this.#values[target] = Tuple(timestamp, value)
    }
    this.#count = this.#count + 1
    this.#sum = this.#sum + value
  }
}

export class SetCountState {
  readonly _tag = "SetCount"

  #count: number
  #values: Map<string, number>

  constructor(readonly key: MetricKey.SetCount, readonly help: string) {
    this.#count = 0
    this.#values = new Map()
  }

  getCount(): number {
    return this.#count
  }

  getCountFor(word: string): number {
    const count = this.#values.get(word)
    return count == null ? 0 : count
  }

  observe(word: string): void {
    this.#count = this.#count + 1
    const result = this.#values.get(word)
    this.#values.set(word, result == null ? 1 : result + 1)
  }

  snapshot(): Chunk<Tuple<[string, number]>> {
    const builder = Chunk.builder<Tuple<[string, number]>>()

    for (const [key, value] of this.#values) {
      builder.append(Tuple(key, value))
    }

    return builder.build()
  }
}

/**
 * @tsplus static ets/MetricStateOps Counter
 */
export function counter(key: MetricKey.Counter, help: string): MetricState {
  return new CounterState(key, help)
}

/**
 * @tsplus static ets/MetricStateOps Gauge
 */
export function gauge(
  key: MetricKey.Gauge,
  help: string,
  startAt: number
): MetricState {
  return new GaugeState(key, help, startAt)
}

/**
 * @tsplus static ets/MetricStateOps Histogram
 */
export function histogram(key: MetricKey.Histogram, help: string): MetricState {
  return new HistogramState(key, help)
}

/**
 * @tsplus static ets/MetricStateOps Summary
 */
export function summary(key: MetricKey.Summary, help: string): MetricState {
  return new SummaryState(key, help)
}

/**
 * @tsplus static ets/MetricStateOps SetCount
 */
export function setCount(key: MetricKey.SetCount, help: string): MetricState {
  return new SetCountState(key, help)
}

/**
 * @tsplus fluent ets/MetricState snapshot
 */
export function snapshot(self: MetricState): MetricSnapshot {
  switch (self._tag) {
    case "Counter": {
      return MetricSnapshot.Counter(self.key, self.help, self.count)
    }
    case "Gauge": {
      return MetricSnapshot.Gauge(self.key, self.help, self.get)
    }
    case "Histogram": {
      return MetricSnapshot.Histogram(
        self.key,
        self.help,
        self.snapshot(),
        self.getCount(),
        self.getSum()
      )
    }
    case "Summary": {
      return MetricSnapshot.Summary(
        self.key,
        self.help,
        self.snapshot(Date.now()),
        self.getCount(),
        self.getSum()
      )
    }
    case "SetCount": {
      return MetricSnapshot.SetCount(self.key, self.help, self.snapshot())
    }
  }
}

class ResolvedQuantile {
  constructor(
    /**
     * The quantile that shall be resolved
     */
    readonly quantile: number,
    /**
     * `Some(d)` if a value for the quantile could be found, `None` otherwise
     */
    readonly value: Option<number>,
    /**
     * How many samples have been consumed before this quantile.
     */
    readonly consumed: number,
    /**
     * The rest of the samples after the quantile has been resolved.
     */
    readonly rest: Chunk<number>
  ) {}
}

function calculateQuantiles(
  sortedSamples: Chunk<number>,
  error: number,
  sortedQuantiles: Chunk<number>
): Chunk<Tuple<[number, Option<number>]>> {
  // The number of the samples examined
  const sampleCount = sortedSamples.size

  if (sortedQuantiles.isEmpty()) {
    return Chunk.empty()
  }

  const resolved = sortedQuantiles
    .unsafeTail()
    .reduce(
      Chunk.single(
        resolveQuantiles(
          Option.none,
          0,
          sortedQuantiles.unsafeHead(),
          sortedSamples,
          error,
          sampleCount
        ).run()
      ),
      (curr, quantile) => {
        const head = curr.unsafeHead()
        return curr.append(
          resolveQuantiles(
            head.value,
            head.consumed,
            quantile,
            head.rest,
            error,
            sampleCount
          ).run()
        )
      }
    )

  return resolved.map((rq) => Tuple(rq.quantile, rq.value))
}

function resolveQuantiles(
  current: Option<number>,
  consumed: number,
  quantile: number,
  rest: Chunk<number>,
  error: number,
  sampleCount: number
): IO<ResolvedQuantile> {
  // If the remaining list of samples is empty there is nothing more to resolve
  if (rest.isEmpty()) {
    return IO.succeed(
      new ResolvedQuantile(quantile, Option.none, consumed, Chunk.empty())
    )
  }

  // If the quantile is the 100% Quantile, we can take the max of all remaining
  // values as the result
  if (quantile === 1) {
    return IO.succeed(
      new ResolvedQuantile(
        quantile,
        Option.some(rest.unsafeLast()),
        consumed + rest.length,
        Chunk.empty()
      )
    )
  }

  // Split in 2 chunks, the first chunk contains all elements of the same value
  // as the chunk head
  const sameHead = rest.splitWhere((_) => _ > rest.unsafeHead())
  // How many elements do we want to accept for this quantile
  const desired = quantile * sampleCount
  // The error margin
  const allowedError = (error / 2) * desired
  // Taking into account the elements consumed from the samples so far and the
  // number of same elements at the beginning of the chunk, calculate the number
  // of elements we would have if we selected the current head as result
  const restAndConsumed = consumed + sameHead.get(0).length
  const restAndError = Math.abs(restAndConsumed - desired)

  // If we haven't got enough elements yet, recurse
  if (restAndConsumed < desired - allowedError) {
    return IO.suspend(
      resolveQuantiles(
        rest.head,
        restAndConsumed,
        quantile,
        sameHead.get(1),
        error,
        sampleCount
      )
    )
  }
  // If we have too many elements, select the previous value and hand back the
  // the rest as leftover
  if (restAndConsumed > desired + allowedError) {
    return IO.succeed(new ResolvedQuantile(quantile, current, consumed, rest))
  }

  // If we are in the target interval, select the current head and hand back
  // the leftover after dropping all elements from the sample chunk that are
  // equal to the current head
  return current.fold(
    IO.suspend(
      resolveQuantiles(
        rest.head,
        restAndConsumed,
        quantile,
        sameHead.get(1),
        error,
        sampleCount
      )
    ),
    (current) => {
      const prevError = Math.abs(desired - current)

      if (restAndError < prevError) {
        return IO.suspend(
          resolveQuantiles(
            rest.head,
            restAndConsumed,
            quantile,
            sameHead.get(1),
            error,
            sampleCount
          )
        )
      }

      return IO.succeed(
        new ResolvedQuantile(quantile, Option.some(current), consumed, rest)
      )
    }
  )
}

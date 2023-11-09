import * as Chunk from "../../Chunk.js"
import * as Duration from "../../Duration.js"
import type { LazyArg } from "../../Function.js"
import { dual, pipe } from "../../Function.js"
import * as HashMap from "../../HashMap.js"
import type * as MetricHook from "../../MetricHook.js"
import type * as MetricKey from "../../MetricKey.js"
import type * as MetricState from "../../MetricState.js"
import * as number from "../../Number.js"
import * as Option from "../../Option.js"
import { pipeArguments } from "../../Pipeable.js"
import * as ReadonlyArray from "../../ReadonlyArray.js"
import * as metricState from "./state.js"

/** @internal */
const MetricHookSymbolKey = "effect/MetricHook"

/** @internal */
export const MetricHookTypeId: MetricHook.MetricHookTypeId = Symbol.for(
  MetricHookSymbolKey
) as MetricHook.MetricHookTypeId

/** @internal */
const metricHookVariance = {
  _In: (_: unknown) => _,
  _Out: (_: never) => _
}

/** @internal */
export const make = <In, Out>(
  options: {
    readonly get: LazyArg<Out>
    readonly update: (input: In) => void
  }
): MetricHook.MetricHook<In, Out> => ({
  [MetricHookTypeId]: metricHookVariance,
  pipe() {
    return pipeArguments(this, arguments)
  },
  ...options
})

/** @internal */
export const onUpdate = dual<
  <In, Out>(f: (input: In) => void) => (self: MetricHook.MetricHook<In, Out>) => MetricHook.MetricHook<In, Out>,
  <In, Out>(self: MetricHook.MetricHook<In, Out>, f: (input: In) => void) => MetricHook.MetricHook<In, Out>
>(2, (self, f) => ({
  [MetricHookTypeId]: metricHookVariance,
  pipe() {
    return pipeArguments(this, arguments)
  },
  get: self.get,
  update: (input) => {
    self.update(input)
    return f(input)
  }
}))

const bigint0 = BigInt(0)

/** @internal */
export const counter = <A extends (number | bigint)>(
  key: MetricKey.MetricKey.Counter<A>
): MetricHook.MetricHook.Counter<A> => {
  let sum: A = key.keyType.bigint ? bigint0 as A : 0 as A
  const canUpdate = key.keyType.incremental
    ? key.keyType.bigint
      ? (value: A) => value >= bigint0
      : (value: A) => value >= 0
    : (_value: A) => true
  return make({
    get: () => metricState.counter(sum as number) as unknown as MetricState.MetricState.Counter<A>,
    update: (value) => {
      if (canUpdate(value)) {
        sum = (sum as any) + value
      }
    }
  })
}

/** @internal */
export const frequency = (_key: MetricKey.MetricKey.Frequency): MetricHook.MetricHook.Frequency => {
  let count = 0
  const values = new Map<string, number>()
  const update = (word: string) => {
    count = count + 1
    const slotCount = values.get(word) ?? 0
    values.set(word, slotCount + 1)
  }
  const snapshot = () => HashMap.fromIterable(values.entries())
  return make({
    get: () => metricState.frequency(snapshot()),
    update
  })
}

/** @internal */
export const gauge: {
  (key: MetricKey.MetricKey.Gauge<number>, startAt: number): MetricHook.MetricHook.Gauge<number>
  (key: MetricKey.MetricKey.Gauge<bigint>, startAt: bigint): MetricHook.MetricHook.Gauge<bigint>
} = <A extends (number | bigint)>(
  _key: MetricKey.MetricKey.Gauge<A>,
  startAt: A
): MetricHook.MetricHook.Gauge<A> => {
  let value = startAt
  return make({
    get: () => metricState.gauge(value as number) as unknown as MetricState.MetricState.Gauge<A>,
    update: (v) => {
      value = v
    }
  })
}

/** @internal */
export const histogram = (key: MetricKey.MetricKey.Histogram): MetricHook.MetricHook.Histogram => {
  const bounds = key.keyType.boundaries.values
  const size = bounds.length
  const values = new Uint32Array(size + 1)
  const boundaries = new Float32Array(size)
  let count = 0
  let sum = 0
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE

  pipe(
    bounds,
    Chunk.sort(number.Order),
    Chunk.map((n, i) => {
      boundaries[i] = n
    })
  )

  // Insert the value into the right bucket with a binary search
  const update = (value: number) => {
    let from = 0
    let to = size
    while (from !== to) {
      const mid = Math.floor(from + (to - from) / 2)
      const boundary = boundaries[mid]
      if (value <= boundary) {
        to = mid
      } else {
        from = mid
      }
      // The special case when to / from have a distance of one
      if (to === from + 1) {
        if (value <= boundaries[from]) {
          to = from
        } else {
          from = to
        }
      }
    }
    values[from] = values[from]! + 1
    count = count + 1
    sum = sum + value
    if (value < min) {
      min = value
    }
    if (value > max) {
      max = value
    }
  }

  const getBuckets = (): Chunk.Chunk<readonly [number, number]> => {
    const builder: Array<readonly [number, number]> = Array(size)
    let cumulated = 0
    for (let i = 0; i < size; i++) {
      const boundary = boundaries[i]
      const value = values[i]
      cumulated = cumulated + value
      builder[i] = [boundary, cumulated]
    }
    return Chunk.unsafeFromArray(builder)
  }

  return make({
    get: () =>
      metricState.histogram({
        buckets: getBuckets(),
        count,
        min,
        max,
        sum
      }),
    update
  })
}

/** @internal */
export const summary = (key: MetricKey.MetricKey.Summary): MetricHook.MetricHook.Summary => {
  const { error, maxAge, maxSize, quantiles } = key.keyType
  const sortedQuantiles = pipe(quantiles, Chunk.sort(number.Order))
  const values = Array<readonly [number, number]>(maxSize)

  let head = 0
  let count = 0
  let sum = 0
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE

  // Just before the snapshot we filter out all values older than maxAge
  const snapshot = (now: number): Chunk.Chunk<readonly [number, Option.Option<number>]> => {
    const builder: Array<number> = []
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
    while (i !== maxSize - 1) {
      const item = values[i]
      if (item != null) {
        const [t, v] = item
        const age = Duration.millis(now - t)
        if (Duration.greaterThanOrEqualTo(age, Duration.zero) && age <= maxAge) {
          builder.push(v)
        }
      }
      i = i + 1
    }
    return calculateQuantiles(
      error,
      sortedQuantiles,
      pipe(Chunk.unsafeFromArray(builder), Chunk.sort(number.Order))
    )
  }

  const observe = (value: number, timestamp: number) => {
    if (maxSize > 0) {
      head = head + 1
      const target = head % maxSize
      values[target] = [timestamp, value] as const
    }
    count = count + 1
    sum = sum + value
    if (value < min) {
      min = value
    }
    if (value > max) {
      max = value
    }
  }

  return make({
    get: () =>
      metricState.summary({
        error,
        quantiles: snapshot(Date.now()),
        count,
        min,
        max,
        sum
      }),
    update: ([value, timestamp]) => observe(value, timestamp)
  })
}

/** @internal */
interface ResolvedQuantile {
  /**
   * The quantile that shall be resolved.
   */
  readonly quantile: number
  /**
   * `Some<number>` if a value for the quantile could be found, otherwise
   * `None`.
   */
  readonly value: Option.Option<number>
  /**
   * How many samples have been consumed prior to this quantile.
   */
  readonly consumed: number
  /**
   * The rest of the samples after the quantile has been resolved.
   */
  readonly rest: Chunk.Chunk<number>
}

/** @internal */
const calculateQuantiles = (
  error: number,
  sortedQuantiles: Chunk.Chunk<number>,
  sortedSamples: Chunk.Chunk<number>
): Chunk.Chunk<readonly [number, Option.Option<number>]> => {
  // The number of samples examined
  const sampleCount = sortedSamples.length
  if (Chunk.isEmpty(sortedQuantiles)) {
    return Chunk.empty()
  }
  const head = Chunk.unsafeHead(sortedQuantiles)
  const tail = pipe(sortedQuantiles, Chunk.drop(1))
  const resolved = pipe(
    tail,
    ReadonlyArray.reduce(
      Chunk.of(
        resolveQuantile(
          error,
          sampleCount,
          Option.none(),
          0,
          head,
          sortedSamples
        )
      ) as Chunk.Chunk<ResolvedQuantile>,
      (accumulator, quantile) => {
        const h = Chunk.unsafeHead(accumulator)
        return pipe(
          accumulator,
          Chunk.append(
            resolveQuantile(
              error,
              sampleCount,
              h.value,
              h.consumed,
              quantile,
              h.rest
            )
          )
        )
      }
    )
  )
  return pipe(resolved, Chunk.map((rq) => [rq.quantile, rq.value] as const))
}

/** @internal */
const resolveQuantile = (
  error: number,
  sampleCount: number,
  current: Option.Option<number>,
  consumed: number,
  quantile: number,
  rest: Chunk.Chunk<number>
): ResolvedQuantile => {
  let error_1 = error
  let sampleCount_1 = sampleCount
  let current_1 = current
  let consumed_1 = consumed
  let quantile_1 = quantile
  let rest_1 = rest
  let error_2 = error
  let sampleCount_2 = sampleCount
  let current_2 = current
  let consumed_2 = consumed
  let quantile_2 = quantile
  let rest_2 = rest
  // eslint-disable-next-line no-constant-condition
  while (1) {
    // If the remaining list of samples is empty, there is nothing more to resolve
    if (Chunk.isEmpty(rest_1)) {
      return {
        quantile: quantile_1,
        value: Option.none(),
        consumed: consumed_1,
        rest: Chunk.empty()
      }
    }
    // If the quantile is the 100% quantile, we can take the maximum of all the
    // remaining values as the result
    if (quantile_1 === 1) {
      return {
        quantile: quantile_1,
        value: Option.some(Chunk.unsafeLast(rest_1)),
        consumed: consumed_1 + rest_1.length,
        rest: Chunk.empty()
      }
    }
    // Split into two chunks - the first chunk contains all elements of the same
    // value as the chunk head
    const sameHead = pipe(rest_1, Chunk.splitWhere((n) => n > Chunk.unsafeHead(rest_1)))
    // How many elements do we want to accept for this quantile
    const desired = quantile_1 * sampleCount_1
    // The error margin
    const allowedError = (error_1 / 2) * desired
    // Taking into account the elements consumed from the samples so far and the
    // number of same elements at the beginning of the chunk, calculate the number
    // of elements we would have if we selected the current head as result
    const candConsumed = consumed_1 + sameHead[0].length
    const candError = Math.abs(candConsumed - desired)
    // If we haven't got enough elements yet, recurse
    if (candConsumed < desired - allowedError) {
      error_2 = error_1
      sampleCount_2 = sampleCount_1
      current_2 = Chunk.head(rest_1)
      consumed_2 = candConsumed
      quantile_2 = quantile_1
      rest_2 = sameHead[1]
      error_1 = error_2
      sampleCount_1 = sampleCount_2
      current_1 = current_2
      consumed_1 = consumed_2
      quantile_1 = quantile_2
      rest_1 = rest_2
      continue
    }
    // If we have too many elements, select the previous value and hand back the
    // the rest as leftover
    if (candConsumed > desired + allowedError) {
      return {
        quantile: quantile_1,
        value: current_1,
        consumed: consumed_1,
        rest: rest_1
      }
    }
    // If we are in the target interval, select the current head and hand back the leftover after dropping all elements
    // from the sample chunk that are equal to the current head
    switch (current_1._tag) {
      case "None": {
        error_2 = error_1
        sampleCount_2 = sampleCount_1
        current_2 = Chunk.head(rest_1)
        consumed_2 = candConsumed
        quantile_2 = quantile_1
        rest_2 = sameHead[1]
        error_1 = error_2
        sampleCount_1 = sampleCount_2
        current_1 = current_2
        consumed_1 = consumed_2
        quantile_1 = quantile_2
        rest_1 = rest_2
        continue
      }
      case "Some": {
        const prevError = Math.abs(desired - current_1.value)
        if (candError < prevError) {
          error_2 = error_1
          sampleCount_2 = sampleCount_1
          current_2 = Chunk.head(rest_1)
          consumed_2 = candConsumed
          quantile_2 = quantile_1
          rest_2 = sameHead[1]
          error_1 = error_2
          sampleCount_1 = sampleCount_2
          current_1 = current_2
          consumed_1 = consumed_2
          quantile_1 = quantile_2
          rest_1 = rest_2
          continue
        }
        return {
          quantile: quantile_1,
          value: Option.some(current_1.value),
          consumed: consumed_1,
          rest: rest_1
        }
      }
    }
  }
  throw new Error("BUG: MetricHook.resolveQuantiles - please report an issue at https://github.com/Effect-TS/io/issues")
}

import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * @tsplus type effect/core/io/Metrics/MetricHooks.Ops
 */
export interface MetricHooksOps {}
export const MetricHooks: MetricHooksOps = {}

/**
 * @tsplus static effect/core/io/Metrics/MetricHooks.Ops counter
 */
export function counter(_key: MetricKey.Counter): MetricHook.Counter {
  let sum = 0
  return MetricHook(
    (value) => {
      sum = sum + value
    },
    () => MetricState.Counter(sum)
  )
}

/**
 * @tsplus static effect/core/io/Metrics/MetricHooks.Ops gauge
 */
export function gauge(_key: MetricKey.Gauge, startAt: number): MetricHook.Gauge {
  let value = startAt
  return MetricHook(
    (v) => {
      value = v
    },
    () => MetricState.Gauge(value)
  )
}

/**
 * @tsplus static effect/core/io/Metrics/MetricHooks.Ops frequency
 */
export function frequency(_key: MetricKey.Frequency): MetricHook.Frequency {
  let count = 0
  const values = new Map<string, number>()

  const update = (word: string) => {
    count = count + 1
    const slotCount = values.get(word) ?? 0
    values.set(word, slotCount + 1)
  }

  const snapshot = () => HashMap(...Array.from(values.entries()).map(([k, v]) => Tuple(k, v)))

  return MetricHook(update, () => MetricState.Frequency(snapshot()))
}

/**
 * @tsplus static effect/core/io/Metrics/MetricHooks.Ops histogram
 */
export function histogram(key: MetricKey.Histogram): MetricHook.Histogram {
  const bounds = key.keyType.boundaries.values
  const size = bounds.length
  const values = Array<number>(size + 1)
  const boundaries = Array<number>(size)

  let count = 0
  let sum = 0
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE

  bounds.sort(Ord.number).mapWithIndex((i, n) => {
    boundaries[i] = n
  })

  // Insert the value into the right bucket with a binary search
  const update = (value: number) => {
    let from = 0
    let to = size
    while (from !== to) {
      const mid = Math.floor(from + (to - from) / 2)
      const boundary = boundaries[mid]!
      if (value <= boundary) {
        to = mid
      } else {
        from = mid
      }
      // The special case when to / from have a distance of one
      if (to === from + 1) {
        if (value <= boundaries[from]!) {
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

  const getBuckets = (): Chunk<Tuple<[number, number]>> => {
    const builder = Chunk.builder<Tuple<[number, number]>>()
    let i = 0
    let cumulated = 0
    while (i != size) {
      const boundary = boundaries[i]!
      const value = values[i]!
      cumulated = cumulated + value
      builder.append(Tuple(boundary, cumulated))
      i = i + 1
    }
    return builder.build()
  }

  return MetricHook(
    update,
    () => MetricState.Histogram(getBuckets(), count, min, max, sum)
  )
}

/**
 * @tsplus static effect/core/io/Metrics/MetricHooks.Ops summary
 */
export function summary(key: MetricKey.Summary): MetricHook.Summary {
  const { error, maxAge, maxSize, quantiles } = key.keyType
  const sortedQuantiles = quantiles.sort(Ord.number)
  const values = Array<Tuple<[number, number]>>(maxSize)

  let head = 0
  let count = 0
  let sum = 0
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE

  // Just before the snapshot we filter out all values older than maxAge
  const snapshot = (now: number): Chunk<Tuple<[number, Maybe<number>]>> => {
    const builder = Chunk.builder<number>()
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
        const { tuple: [t, v] } = item
        const age = new DurationInternal(now - t)
        if (age.millis >= 0 && age <= maxAge) {
          builder.append(v)
        }
      }
      i = i + 1
    }
    return calculateQuantiles(error, sortedQuantiles, builder.build().sort(Ord.number))
  }

  const observe = (value: number, timestamp: number) => {
    if (maxSize > 0) {
      head = head + 1
      const target = head % maxSize
      values[target] = Tuple(timestamp, value)
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

  return MetricHook(
    ({ tuple: [value, timestamp] }) => observe(value, timestamp),
    () => MetricState.Summary(error, snapshot(Date.now()), count, min, max, sum)
  )
}

export class ResolvedQuantile {
  constructor(
    /**
     * The quantile that shall be resolved.
     */
    readonly quantile: number,
    /**
     * `Some<number>` if a value for the quantile could be found, otherwise
     * `None`.
     */
    readonly value: Maybe<number>,
    /**
     * How many samples have been consumed prior to this quantile.
     */
    readonly consumed: number,
    /**
     * The rest of the samples after the quantile has been resolved.
     */
    readonly rest: Chunk<number>
  ) {}
}

function calculateQuantiles(
  error: number,
  sortedQuantiles: Chunk<number>,
  sortedSamples: Chunk<number>
): Chunk<Tuple<[number, Maybe<number>]>> {
  // The number of samples examined
  const sampleCount = sortedSamples.length

  if (sortedQuantiles.isEmpty) {
    return Chunk.empty()
  }

  const head = sortedQuantiles.unsafeHead
  const tail = sortedQuantiles.unsafeTail
  const resolved = tail.reduce(
    Chunk.single(
      resolveQuantile(
        error,
        sampleCount,
        Maybe.none,
        0,
        head,
        sortedSamples
      )
    ),
    (acc, quantile) => {
      const h = acc.unsafeHead
      return acc.append(
        resolveQuantile(
          error,
          sampleCount,
          h.value,
          h.consumed,
          quantile,
          h.rest
        )
      )
    }
  )

  return resolved.map((rq) => Tuple(rq.quantile, rq.value))
}

/**
 * @tsplus tailRec
 */
function resolveQuantile(
  error: number,
  sampleCount: number,
  current: Maybe<number>,
  consumed: number,
  quantile: number,
  rest: Chunk<number>
): ResolvedQuantile {
  // If the remaining list of samples is empty, there is nothing more to resolve
  if (rest.isEmpty) {
    return new ResolvedQuantile(quantile, Maybe.none, consumed, Chunk.empty())
  }
  // If the quantile is the 100% quantile, we can take the maximum of all the
  // remaining values as the result
  if (quantile === 1) {
    return new ResolvedQuantile(
      quantile,
      Maybe.some(rest.unsafeLast),
      consumed + rest.length,
      Chunk.empty()
    )
  }
  // Split into two chunks - the first chunk contains all elements of the same
  // value as the chunk head
  const sameHead = rest.splitWhere((n) => n > rest.unsafeHead)
  // How many elements do we want to accept for this quantile
  const desired = quantile * sampleCount
  // The error margin
  const allowedError = (error / 2) * desired
  // Taking into account the elements consumed from the samples so far and the
  // number of same elements at the beginning of the chunk, calculate the number
  // of elements we would have if we selected the current head as result
  const candConsumed = consumed + sameHead.get(0).length
  const candError = Math.abs(candConsumed - desired)

  // If we haven't got enough elements yet, recurse
  if (candConsumed < desired - allowedError) {
    return resolveQuantile(
      error,
      sampleCount,
      rest.head,
      candConsumed,
      quantile,
      sameHead.get(1)
    )
  }

  // If we have too many elements, select the previous value and hand back the
  // the rest as leftover
  if (candConsumed > desired + allowedError) {
    return new ResolvedQuantile(quantile, current, consumed, rest)
  }

  // If we are in the target interval, select the current head and hand back the leftover after dropping all elements
  // from the sample chunk that are equal to the current head
  switch (current._tag) {
    case "None": {
      return resolveQuantile(
        error,
        sampleCount,
        rest.head,
        candConsumed,
        quantile,
        sameHead.get(1)
      )
    }
    case "Some": {
      const prevError = Math.abs(desired - current.value)
      if (candError < prevError) {
        return resolveQuantile(
          error,
          sampleCount,
          rest.head,
          candConsumed,
          quantile,
          sameHead.get(1)
        )
      }
      return new ResolvedQuantile(
        quantile,
        Maybe.some(current.value),
        consumed,
        rest
      )
    }
  }
}

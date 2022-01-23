import { reduce_ } from "../../collection/immutable/Chunk/api/reduce"
import { splitWhere_ } from "../../collection/immutable/Chunk/api/splitWhere"
import * as C from "../../collection/immutable/Chunk/core"
import * as Tp from "../../collection/immutable/Tuple"
import * as IO from "../../io-light/IO"
import * as O from "../../data/Option"
import { AtomicNumber } from "../../support/AtomicNumber"

export interface ConcurrentSummary {
  /**
   * The count how many values have been observed in total.
   *
   * It is **NOT** the number of samples currently held (i.e.
   * `count() >= samples.size`).
   */
  readonly getCount: () => number
  /**
   * The sum of all values ever observed.
   */
  readonly getSum: () => number
  /**
   * Observe a single value and record it in the summary.
   */
  readonly observe: (value: number, time: Date) => void
  /**
   * Create a snapshot.
   * - Chunk of (tuple of (quantile boundary, satisfying value if found))
   */
  readonly snapshot: (now: Date) => C.Chunk<Tp.Tuple<[number, O.Option<number>]>>
}

class ConcurrentSummaryImpl implements ConcurrentSummary {
  private values = new Array<Tp.Tuple<[Date, number]>>(this.maxSize)

  private head = new AtomicNumber(0)

  private count = new AtomicNumber(0)

  private sum = new AtomicNumber(0)

  private sortedQuantiles: C.Chunk<number>

  constructor(
    readonly maxSize: number,
    readonly maxAge: Date,
    readonly error: number,
    readonly quantiles: C.Chunk<number>
  ) {
    this.sortedQuantiles = C.from((C.toArray(quantiles) as Array<number>).sort())
  }

  getCount(): number {
    return this.count.get
  }

  getSum(): number {
    return this.sum.get
  }

  // Just before the snapshot we filter out all values older than maxAge
  snapshot(now: Date): C.Chunk<Tp.Tuple<[number, O.Option<number>]>> {
    const builder = C.builder<number>()

    // If the buffer is not full yet it contains valid items at the 0..last indices
    // and null values at the rest of the positions.
    // If the buffer is already full then all elements contains a valid measurement with timestamp.
    //
    // At any given point in time we can enumerate all the non-null elements in the buffer and filter
    // them by timestamp to get a valid view of a time window.
    //
    // The order does not matter because it gets sorted before passing to calculateQuantiles.

    const i = 0
    while (i !== this.maxSize) {
      const item = this.values[i]
      if (item != null) {
        const {
          tuple: [t, v]
        } = item
        const ageInMillis = now.getTime() - t.getTime()
        if (ageInMillis >= 0 && ageInMillis <= this.maxAge.getTime()) {
          builder.append(v)
        }
      }
    }

    return calculateQuantiles(
      C.from((C.toArray(builder.build()) as Array<number>).sort()),
      this.error,
      this.sortedQuantiles
    )
  }

  observe(value: number, time: Date): void {
    if (this.maxSize > 0) {
      const target = this.head.incrementAndGet() % this.maxSize
      this.values[target] = Tp.tuple(time, value)
    }

    this.count.set(this.count.get + 1)
    this.sum.set(this.sum.get + value)
  }
}

export function manual(
  maxSize: number,
  maxAge: Date,
  error: number,
  quantiles: C.Chunk<number>
): ConcurrentSummary {
  return new ConcurrentSummaryImpl(maxSize, maxAge, error, quantiles)
}

class ResolvedQuantile {
  constructor(
    /**
     * The quantile that shall be resolved.
     */
    readonly quantile: number,
    /**
     * `Some(d)` if a value for the quantile could be found, `None` otherwise.
     */
    readonly value: O.Option<number>,
    /**
     * How many samples have been consumed before this quantile.
     */
    readonly consumed: number,
    /**
     * The rest of the samples after the quantile has been resolved.
     */
    readonly rest: C.Chunk<number>
  ) {}
}

function calculateQuantiles(
  sortedSamples: C.Chunk<number>,
  error: number,
  sortedQuantiles: C.Chunk<number>
): C.Chunk<Tp.Tuple<[number, O.Option<number>]>> {
  // The number of the samples examined
  const sampleCount = sortedSamples.length

  if (C.isEmpty(sortedQuantiles)) {
    return C.empty()
  }

  const resolved = reduce_(
    C.unsafeTail(sortedQuantiles),
    C.single(
      IO.run(
        resolveQuantiles(
          O.none,
          0,
          C.unsafeHead(sortedQuantiles),
          sortedSamples,
          error,
          sampleCount
        )
      )
    ),
    (curr, q) => {
      const head = C.unsafeHead(curr)
      return C.prepend_(
        curr,
        IO.run(
          resolveQuantiles(head.value, head.consumed, q, head.rest, error, sampleCount)
        )
      )
    }
  )

  return C.map_(resolved, (rq) => Tp.tuple(rq.quantile, rq.value))
}

function resolveQuantiles(
  current: O.Option<number>,
  consumed: number,
  q: number,
  c: C.Chunk<number>,
  error: number,
  sampleCount: number
): IO.IO<ResolvedQuantile> {
  // If the remaining list of samples is empty there is nothing more to resolve
  if (C.isEmpty(c)) {
    return IO.succeed(new ResolvedQuantile(q, O.none, consumed, C.empty()))
  }
  // If the quantile is the 100% Quantile, we can take the max of all remaining
  // values as the result
  if (q > 0.999) {
    return IO.succeed(
      new ResolvedQuantile(q, O.some(C.unsafeLast(c)), consumed + c.length, C.empty())
    )
  }

  // Split in 2 chunks, the first chunk contains all elements of the same value
  // as the chunk head
  const sameHead = splitWhere_(c, (_) => _ > C.unsafeHead(c))
  // How many elements do we want to accept for this quantile
  const desired = q * sampleCount
  // The error margin
  const allowedError = (error / 2) * desired
  // Taking into account the elements consumed from the samples so far and the
  // number of same elements at the beginning of the chunk, calculate the number
  // of elements we would have if we selected the current head as result
  const candConsumed = consumed + sameHead.get(0).length
  const candError = Math.abs(candConsumed - desired)

  if (candConsumed < desired - allowedError) {
    // If we haven't got enough elements yet, recurse
    return IO.suspend(() =>
      resolveQuantiles(C.head(c), candConsumed, q, sameHead.get(1), error, sampleCount)
    )
  } else if (candConsumed > desired + allowedError) {
    // If we have too many elements, select the previous value and hand back
    // the rest as leftover
    return IO.succeed(new ResolvedQuantile(q, current, consumed, c))
  }

  // If we are in the target interval, select the current head and hand back the leftover after dropping all elements
  // from the sample chunk that are equal to the current head
  return O.fold_(
    current,
    () =>
      IO.suspend(() =>
        resolveQuantiles(
          C.head(c),
          candConsumed,
          q,
          sameHead.get(1),
          error,
          sampleCount
        )
      ),
    (curr) => {
      const prevError = Math.abs(desired - curr)

      if (candError < prevError) {
        return IO.suspend(() =>
          resolveQuantiles(
            C.head(c),
            candConsumed,
            q,
            sameHead.get(1),
            error,
            sampleCount
          )
        )
      }

      return IO.succeed(new ResolvedQuantile(q, O.some(curr), consumed, c))
    }
  )
}

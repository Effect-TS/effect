import * as C from "../../Collections/Immutable/Chunk"
import * as Tp from "../../Collections/Immutable/Tuple"
import { AtomicNumber } from "../../Support/AtomicNumber"

export interface ConcurrentHistogram {
  /**
   * The overall count for all observed values in the histogram.
   */
  readonly getCount: () => number
  /**
   * The sum of all observed values.
   */
  readonly getSum: () => number

  /**
   * Observe a single value.
   */
  readonly observe: (value: number) => void
  /**
   * Create a snapshot (boundary, sum of all observed values for the bucket with that boundary).
   */
  readonly snapshot: () => C.Chunk<Tp.Tuple<[number, number]>>
}

class ConcurrentHistogramImpl implements ConcurrentHistogram {
  private values = Array.from({ length: this.bounds.length + 1 }, () => 0)

  private boundaries = new Array(this.bounds.length)

  private count = new AtomicNumber(0)

  private sum = new AtomicNumber(0)

  private size = this.bounds.length

  constructor(readonly bounds: C.Chunk<number>) {
    const _bounds = C.toArray(bounds) as Array<number>
    _bounds.sort().forEach((n, i) => {
      this.boundaries[i] = n
    })
  }

  getCount(): number {
    return this.count.get
  }

  getSum(): number {
    return this.sum.get
  }

  observe(value: number): void {
    let from = 0
    let to = this.size
    while (from !== to) {
      // Perform integer division to get mid
      const calc = from + (to - from)
      const rem = calc % 2
      const mid = (calc - rem) / 2

      const boundary = this.boundaries[mid]!

      if (value <= boundary) {
        to = mid
      } else {
        from = mid
      }

      // The special case when to / from have a distance of one
      if (to == from + 1) {
        if (value <= this.boundaries[from]!) {
          to = from
        } else {
          from = to
        }
      }
    }

    this.values[from] = this.values[from]! + 1
    this.count.set(this.count.get + 1)
    this.sum.set(this.sum.get + value)
  }

  snapshot(): C.Chunk<Tp.Tuple<[number, number]>> {
    const builder = C.builder<Tp.Tuple<[number, number]>>()

    let i = 0
    let accumulated = 0
    while (i !== this.size) {
      const boundary = this.boundaries[i]!
      const value = this.values[i]!
      accumulated += value
      builder.append(Tp.tuple(boundary, accumulated))
      i += 1
    }

    return builder.build()
  }
}

export function manual(bounds: C.Chunk<number>): ConcurrentHistogram {
  return new ConcurrentHistogramImpl(bounds)
}

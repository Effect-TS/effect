import { Chunk } from "../../../collection/immutable/Chunk"
import * as St from "../../../prelude/Structural"
import type { Metric } from "../Metric"

export const HistogramSym = Symbol.for("@effect-ts/core/io/Metrics/Histogram")
export type HistogramSym = typeof HistogramSym

export const HistogramBoundariesSym = Symbol.for(
  "@effect-ts/core/io/Metrics/Histogram/Boundaries"
)
export type HistogramBoundariesSym = typeof HistogramBoundariesSym

/**
 * A `Histogram` is a metric representing a collection of numerical values
 * with the distribution of the cumulative values over time. A typical use of
 * this metric would be to track the time to serve requests. Histograms allow
 * visualizing not only the value of the quantity being measured but its
 * distribution. Histograms are constructed with user specified boundaries
 * which describe the buckets to aggregate values into.
 *
 * @tsplus type ets/Histogram
 */
export interface Histogram<A> extends Metric<A> {
  readonly [HistogramSym]: HistogramSym
  readonly boundaries: Boundaries
}

export interface HistogramBoundaries {
  readonly [HistogramBoundariesSym]: HistogramBoundariesSym
}

export declare namespace Histogram {
  export type Boundaries = HistogramBoundaries
}

/**
 * @tsplus type ets/HistogramOps
 */
export interface HistogramOps {}
export const Histogram: HistogramOps = {}

/**
 * @tsplus unify ets/Histogram
 */
export function unifyHistogram<X extends Histogram<any>>(
  self: X
): Histogram<[X] extends [Histogram<infer AX>] ? AX : never> {
  return self
}

/**
 * @tsplus type ets/HistogramBoundaries
 * @tsplus companion ets/HistogramBoundariesOps
 */
export class Boundaries implements HistogramBoundaries, St.HasHash, St.HasEquals {
  readonly [HistogramBoundariesSym]: HistogramBoundariesSym = HistogramBoundariesSym

  constructor(readonly chunk: Chunk<number>) {}

  get [St.hashSym](): number {
    return St.hash(this.chunk)
  }

  [St.equalsSym](that: unknown): boolean {
    return isBoundaries(that) && St.equals(this.chunk, that.chunk)
  }
}

/**
 * @tsplus static ets/HistogramBoundariesOps fromChunk
 */
export function fromChunk(chunk: Chunk<number>): Boundaries {
  return new Boundaries(
    // TODO(Mike/Max): Chunk.distinct
    Chunk.from(new Set([...chunk.append(Number.MAX_SAFE_INTEGER).toArray()]))
  )
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values.
 *
 * @tsplus static ets/HistogramBoundariesOps linear
 */
export function linear(start: number, width: number, count: number): Boundaries {
  return Boundaries.fromChunk(Chunk.range(0, count - 1).map((i) => start + i * width))
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @tsplus static ets/HistogramBoundariesOps exponential
 */
export function exponential(start: number, factor: number, count: number): Boundaries {
  return Boundaries.fromChunk(
    Chunk.range(0, count - 1).map((i) => start * Math.pow(factor, i))
  )
}

/**
 * @tsplus static ets/HistogramBoundariesOps isBoundaries
 */
export function isBoundaries(u: unknown): u is Boundaries {
  return typeof u === "object" && u != null && HistogramBoundariesSym in u
}

export const HistogramSym = Symbol.for("@effect/core/io/Metrics/Histogram");
export type HistogramSym = typeof HistogramSym;

export const HistogramBoundariesSym = Symbol.for("@effect/core/io/Metrics/Histogram/Boundaries");
export type HistogramBoundariesSym = typeof HistogramBoundariesSym;

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
  readonly [HistogramSym]: HistogramSym;
  readonly boundaries: Boundaries;
}

export interface HistogramBoundaries {
  readonly [HistogramBoundariesSym]: HistogramBoundariesSym;
}

export declare namespace Histogram {
  export type Boundaries = HistogramBoundaries;
}

/**
 * @tsplus type ets/Histogram/Ops
 */
export interface HistogramOps {
  $: HistogramAspects;
}
export const Histogram: HistogramOps = {
  $: {}
};

/**
 * @tsplus type ets/Histogram/Aspects
 */
export interface HistogramAspects {}

/**
 * @tsplus unify ets/Histogram
 */
export function unifyHistogram<X extends Histogram<any>>(
  self: X
): Histogram<[X] extends [Histogram<infer AX>] ? AX : never> {
  return self;
}

/**
 * @tsplus type ets/HistogramBoundaries
 * @tsplus companion ets/HistogramBoundaries/Ops
 */
export class Boundaries implements HistogramBoundaries, Equals {
  readonly [HistogramBoundariesSym]: HistogramBoundariesSym = HistogramBoundariesSym;

  constructor(readonly chunk: Chunk<number>) {}

  [Hash.sym](): number {
    return Hash.unknown(this.chunk);
  }

  [Equals.sym](that: unknown): boolean {
    return isBoundaries(that) && this.chunk == that.chunk;
  }
}

/**
 * @tsplus static ets/HistogramBoundaries/Ops fromChunk
 */
export function fromChunk(chunk: Chunk<number>): Boundaries {
  return new Boundaries(
    // TODO(Mike/Max): Chunk.distinct
    Chunk.from(new Set([...Array.from(chunk.append(Number.MAX_SAFE_INTEGER))]))
  );
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values.
 *
 * @tsplus static ets/HistogramBoundaries/Ops linear
 */
export function linear(start: number, width: number, count: number): Boundaries {
  return Boundaries.fromChunk(Chunk.range(0, count - 1).map((i) => start + i * width));
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @tsplus static ets/HistogramBoundaries/Ops exponential
 */
export function exponential(start: number, factor: number, count: number): Boundaries {
  return Boundaries.fromChunk(
    Chunk.range(0, count - 1).map((i) => start * Math.pow(factor, i))
  );
}

/**
 * @tsplus static ets/HistogramBoundaries/Ops isBoundaries
 */
export function isBoundaries(u: unknown): u is Boundaries {
  return typeof u === "object" && u != null && HistogramBoundariesSym in u;
}

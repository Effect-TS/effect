export const HistogramBoundariesSym = Symbol.for("@effect/core/io/Metrics/Histogram/Boundaries");
export type HistogramBoundariesSym = typeof HistogramBoundariesSym;

/**
 * @tsplus type ets/Metrics/Histogram/Boundaries
 */
export interface HistogramBoundaries extends Equals {
  readonly values: Chunk<number>;
}

export class HistogramBoundariesInternal implements HistogramBoundaries {
  readonly [HistogramBoundariesSym]: HistogramBoundariesSym = HistogramBoundariesSym;

  constructor(readonly values: Chunk<number>) {}

  [Hash.sym](): number {
    return Hash.combine(
      Hash.string("ets/Metrics/Histogram/Boundaries"),
      Hash.unknown(this.values)
    );
  }

  [Equals.sym](u: unknown): boolean {
    return isHistogramBoundaries(u) && this.values == u.values;
  }
}

/**
 * @tsplus type ets/Metrics/Histogram/Boundaries/Ops
 */
export interface HistogramBoundariesOps {}
export const HistogramBoundaries: HistogramBoundariesOps = {};

/**
 * @tsplus static ets/Metrics/Histogram/Boundaries/Ops linear
 */
export function fromChunk(chunk: Chunk<number>): HistogramBoundaries {
  return new HistogramBoundariesInternal(
    (chunk + Chunk.single(Number.MAX_VALUE)).uniq(Equivalence.number)
  );
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values.
 *
 * @tsplus static ets/Metrics/Histogram/Boundaries/Ops linear
 */
export function linear(start: number, width: number, count: number): HistogramBoundaries {
  return fromChunk(Chunk.range(0, count - 1).map((i) => start + i * width));
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @tsplus static ets/Metrics/Histogram/Boundaries/Ops exponential
 */
export function exponential(start: number, factor: number, count: number): HistogramBoundaries {
  return fromChunk(Chunk.range(0, count - 1).map((i) => start * Math.pow(factor, i)));
}

/**
 * @tsplus static ets/Metrics/Histogram/Boundaries/Ops isHistogramBoundaries
 */
export function isHistogramBoundaries(u: unknown): u is HistogramBoundaries {
  return typeof u === "object" && u != null && HistogramBoundariesSym in u;
}

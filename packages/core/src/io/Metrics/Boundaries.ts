import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const HistogramBoundariesSymbolKey = "effect/core/io/Metrics/Histogram/Boundaries"

/**
 * @category symbol
 * @since 1.0.0
 */
export const HistogramBoundariesSym = Symbol.for(HistogramBoundariesSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type HistogramBoundariesSym = typeof HistogramBoundariesSym

/**
 * @tsplus type effect/core/io/Metrics/Histogram/Boundaries
 * @category model
 * @since 1.0.0
 */
export interface HistogramBoundaries extends Equal.Equal {
  readonly values: Chunk.Chunk<number>
}

/** @internal */
export class HistogramBoundariesInternal implements HistogramBoundaries {
  readonly [HistogramBoundariesSym]: HistogramBoundariesSym = HistogramBoundariesSym

  constructor(readonly values: Chunk.Chunk<number>) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(HistogramBoundariesSymbolKey),
      Equal.hashCombine(Equal.hash(this.values))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isHistogramBoundaries(u) && Equal.equals(this.values, u.values)
  }
}

/**
 * @tsplus type effect/core/io/Metrics/Histogram/Boundaries.Ops
 * @category model
 * @since 1.0.0
 */
export interface HistogramBoundariesOps {}
export const HistogramBoundaries: HistogramBoundariesOps = {}

/**
 * @tsplus static effect/core/io/Metrics/Histogram/Boundaries.Ops linear
 * @category constructors
 * @since 1.0.0
 */
export function fromChunk(chunk: Chunk.Chunk<number>): HistogramBoundaries {
  const values = pipe(
    chunk,
    Chunk.concat(Chunk.single(Infinity)),
    Chunk.dedupe
  )
  return new HistogramBoundariesInternal(values)
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values.
 *
 * @tsplus static effect/core/io/Metrics/Histogram/Boundaries.Ops linear
 * @category constructors
 * @since 1.0.0
 */
export function linear(start: number, width: number, count: number): HistogramBoundaries {
  return pipe(
    Chunk.range(0, count - 1),
    Chunk.map((i) => start + i * width),
    fromChunk
  )
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @tsplus static effect/core/io/Metrics/Histogram/Boundaries.Ops exponential
 * @category constructors
 * @since 1.0.0
 */
export function exponential(start: number, factor: number, count: number): HistogramBoundaries {
  return pipe(
    Chunk.range(0, count - 1),
    Chunk.map((i) => start * Math.pow(factor, i)),
    fromChunk
  )
}

/**
 * @tsplus static effect/core/io/Metrics/Histogram/Boundaries.Ops isHistogramBoundaries
 * @category refinements
 * @since 1.0.0
 */
export function isHistogramBoundaries(u: unknown): u is HistogramBoundaries {
  return typeof u === "object" && u != null && HistogramBoundariesSym in u
}

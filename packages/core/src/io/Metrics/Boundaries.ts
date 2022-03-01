import { Chunk } from "../../collection/immutable/Chunk"
import * as St from "../../prelude/Structural"

export const BoundariesSym = Symbol.for("@effect-ts/core/io/Metrics/Boundaries")
export type BoundariesSym = typeof BoundariesSym

/**
 * @tsplus type ets/Boundaries
 * @tsplus companion ets/BoundariesOps
 */
export class Boundaries implements St.HasHash, St.HasEquals {
  constructor(readonly chunk: Chunk<number>) {}

  get [St.hashSym](): number {
    return St.hash(this.chunk)
  }

  [St.equalsSym](that: unknown): boolean {
    return isBoundaries(that) && St.equals(this.chunk, that.chunk)
  }
}

/**
 * @tsplus static ets/BoundariesOps fromChunk
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
 * @tsplus static ets/BoundariesOps linear
 */
export function linear(start: number, width: number, count: number): Boundaries {
  return Boundaries.fromChunk(Chunk.range(0, count - 1).map((i) => start + i * width))
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values.
 *
 * @tsplus static ets/BoundariesOps exponential
 */
export function exponential(start: number, factor: number, count: number): Boundaries {
  return Boundaries.fromChunk(
    Chunk.range(0, count - 1).map((i) => start * Math.pow(factor, i))
  )
}

/**
 * @tsplus static ets/BoundariesOps isBoundaries
 */
export function isBoundaries(u: unknown): u is Boundaries {
  return typeof u === "object" && u != null && BoundariesSym in u
}

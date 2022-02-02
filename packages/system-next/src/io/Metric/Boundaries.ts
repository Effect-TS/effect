import * as A from "../../collection/immutable/Array"
import { Chunk } from "../../collection/immutable/Chunk"
import * as St from "../../prelude/Structural"

export const BoundariesSym = Symbol.for("@effect-ts/core/Metric/Boundaries")

export type BoundariesSym = typeof BoundariesSym

export class Boundaries implements St.HasHash, St.HasEquals {
  constructor(readonly chunk: Chunk<number>) {}

  get [St.hashSym](): number {
    return this.chunk[St.hashSym]
  }

  [St.equalsSym](that: unknown): boolean {
    return isBoundaries(that) && St.equals(this.chunk, that.chunk)
  }
}

export function fromChunk(chunk: Chunk<number>): Boundaries {
  return new Boundaries(
    Chunk.from(new Set([...chunk.append(Number.MAX_SAFE_INTEGER).toArray()]))
  )
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with linear increasing values
 */
export function linear(start: number, width: number, count: number): Boundaries {
  return fromChunk(Chunk.from(A.range(0, count - 1).map((i) => start + i * width)))
}

/**
 * A helper method to create histogram bucket boundaries for a histogram
 * with exponentially increasing values
 */
export function exponential(start: number, factor: number, count: number): Boundaries {
  return fromChunk(
    Chunk.from(A.range(0, count - 1).map((i) => start * Math.pow(factor, i)))
  )
}

export function isBoundaries(u: unknown): u is Boundaries {
  return typeof u === "object" && u != null && BoundariesSym in u
}

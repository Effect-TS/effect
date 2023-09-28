import * as Chunk from "../../Chunk"
import * as Equal from "../../Equal"
import { pipe } from "../../Function"
import * as Hash from "../../Hash"
import type * as MetricBoundaries from "../../MetricBoundaries"
import { pipeArguments } from "../../Pipeable"
import * as ReadonlyArray from "../../ReadonlyArray"

/** @internal */
const MetricBoundariesSymbolKey = "effect/MetricBoundaries"

/** @internal */
export const MetricBoundariesTypeId: MetricBoundaries.MetricBoundariesTypeId = Symbol.for(
  MetricBoundariesSymbolKey
) as MetricBoundaries.MetricBoundariesTypeId

/** @internal */
class MetricBoundariesImpl implements MetricBoundaries.MetricBoundaries {
  readonly [MetricBoundariesTypeId]: MetricBoundaries.MetricBoundariesTypeId = MetricBoundariesTypeId
  constructor(readonly values: Chunk.Chunk<number>) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(MetricBoundariesSymbolKey),
      Hash.combine(Hash.hash(this.values))
    )
  }
  [Equal.symbol](u: unknown): boolean {
    return isMetricBoundaries(u) && Equal.equals(this.values, u.values)
  }
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/** @internal */
export const isMetricBoundaries = (u: unknown): u is MetricBoundaries.MetricBoundaries => {
  return typeof u === "object" && u != null && MetricBoundariesTypeId in u
}

/** @internal */
export const fromChunk = (chunk: Chunk.Chunk<number>): MetricBoundaries.MetricBoundaries => {
  const values = pipe(
    chunk,
    Chunk.appendAll(Chunk.of(Number.POSITIVE_INFINITY)),
    Chunk.dedupe
  )
  return new MetricBoundariesImpl(values)
}

/** @internal */
export const linear = (options: {
  readonly start: number
  readonly width: number
  readonly count: number
}): MetricBoundaries.MetricBoundaries =>
  pipe(
    ReadonlyArray.makeBy(options.count - 1, (i) => options.start + i * options.width),
    Chunk.unsafeFromArray,
    fromChunk
  )

/** @internal */
export const exponential = (options: {
  readonly start: number
  readonly factor: number
  readonly count: number
}): MetricBoundaries.MetricBoundaries =>
  pipe(
    ReadonlyArray.makeBy(options.count - 1, (i) => options.start * Math.pow(options.factor, i)),
    Chunk.unsafeFromArray,
    fromChunk
  )

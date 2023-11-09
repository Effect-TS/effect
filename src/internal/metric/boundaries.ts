import { Chunk } from "../../exports/Chunk.js"
import { Equal } from "../../exports/Equal.js"
import { pipe } from "../../exports/Function.js"
import { Hash } from "../../exports/Hash.js"
import type { MetricBoundaries } from "../../exports/MetricBoundaries.js"
import { pipeArguments } from "../../exports/Pipeable.js"
import { hasProperty } from "../../exports/Predicate.js"
import { ReadonlyArray } from "../../exports/ReadonlyArray.js"

/** @internal */
const MetricBoundariesSymbolKey = "effect/MetricBoundaries"

/** @internal */
export const MetricBoundariesTypeId: MetricBoundaries.MetricBoundariesTypeId = Symbol.for(
  MetricBoundariesSymbolKey
) as MetricBoundaries.MetricBoundariesTypeId

/** @internal */
class MetricBoundariesImpl implements MetricBoundaries {
  readonly [MetricBoundariesTypeId]: MetricBoundaries.MetricBoundariesTypeId = MetricBoundariesTypeId
  constructor(readonly values: Chunk<number>) {}
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
export const isMetricBoundaries = (u: unknown): u is MetricBoundaries => hasProperty(u, MetricBoundariesTypeId)

/** @internal */
export const fromChunk = (chunk: Chunk<number>): MetricBoundaries => {
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
}): MetricBoundaries =>
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
}): MetricBoundaries =>
  pipe(
    ReadonlyArray.makeBy(options.count - 1, (i) => options.start * Math.pow(options.factor, i)),
    Chunk.unsafeFromArray,
    fromChunk
  )

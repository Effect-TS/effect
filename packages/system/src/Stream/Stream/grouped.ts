// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as TR from "../Transducer/index.js"
import { aggregate_ } from "./aggregate.js"
import type { Stream } from "./definitions.js"

/**
 * Partitions the stream with specified chunkSize
 * @param chunkSize size of the chunk
 */
export function grouped_<R, E, O>(
  self: Stream<R, E, O>,
  chunkSize: number
): Stream<R, E, A.Chunk<O>> {
  return aggregate_(self, TR.collectAllN(chunkSize))
}

/**
 * Partitions the stream with specified chunkSize
 * @param chunkSize size of the chunk
 */
export function grouped(chunkSize: number) {
  return <R, E, O>(self: Stream<R, E, O>) => grouped_(self, chunkSize)
}

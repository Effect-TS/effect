import type * as A from "../../Array"
import * as TR from "../Transducer"
import { aggregate_ } from "./aggregate"
import type { Stream } from "./definitions"

/**
 * Partitions the stream with specified chunkSize
 * @param chunkSize size of the chunk
 */
export function grouped_<R, E, O>(
  self: Stream<R, E, O>,
  chunkSize: number
): Stream<R, E, A.Array<O>> {
  return aggregate_(self, TR.collectAllN(chunkSize))
}

/**
 * Partitions the stream with specified chunkSize
 * @param chunkSize size of the chunk
 */
export function grouped(chunkSize: number) {
  return <R, E, O>(self: Stream<R, E, O>) => grouped_(self, chunkSize)
}

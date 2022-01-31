// ets_tracing: off

import * as Chunk from "../core.js"
import { concreteId } from "../definition.js"
import { forEach_ } from "./forEach.js"

/**
 * Splits this chunk into `n` equally sized chunks.
 */
export function split_<A>(
  self: Chunk.Chunk<A>,
  n: number
): Chunk.Chunk<Chunk.Chunk<A>> {
  const length = concreteId(self).length
  const k = Math.floor(n)
  const quotient = Math.floor(length / k)
  const remainder = length % k

  let chunks = Chunk.empty<Chunk.Chunk<A>>()
  let i = 0

  let chunk = Chunk.empty<A>()

  forEach_(self, (a) => {
    chunk = Chunk.append_(chunk, a)
    if (
      (i <= remainder && concreteId(chunk).length > quotient) ||
      (i > remainder && concreteId(chunk).length >= quotient)
    ) {
      chunks = Chunk.append_(chunks, chunk)
      chunk = Chunk.empty()
    }
    i++
  })

  if (concreteId(chunk).length > 0) {
    chunks = Chunk.append_(chunks, chunk)
  }

  return chunks
}

/**
 * Splits this chunk into `n` equally sized chunks.
 *
 * @ets_data_first split_
 */
export function split(
  n: number
): <A>(self: Chunk.Chunk<A>) => Chunk.Chunk<Chunk.Chunk<A>> {
  return (self) => split_(self, n)
}

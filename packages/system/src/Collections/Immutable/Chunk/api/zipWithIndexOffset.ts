// ets_tracing: off

import * as Tp from "../../Tuple/index.js"
import { append_, empty } from "../core.js"
import type { Chunk } from "../definition.js"
import { concreteId } from "../definition.js"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 */
export function zipWithIndexOffset_<A>(
  self: Chunk<A>,
  offset: number
): Chunk<Tp.Tuple<[A, number]>> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let i = offset
  let builder = empty<Tp.Tuple<[A, number]>>()
  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (j < len) {
      const a = array[j]!
      builder = append_(builder, Tp.tuple(a, i))
      j++
      i++
    }
  }

  return builder
}

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 *
 * @ets_data_first zipWithIndexOffset_
 */
export function zipWithIndexOffset(
  offset: number
): <A>(self: Chunk<A>) => Chunk<Tp.Tuple<[A, number]>> {
  return (self) => zipWithIndexOffset_(self, offset)
}

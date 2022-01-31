import { Tuple } from "../../Tuple"
import type { Chunk } from "../_definition"
import { concreteId } from "../_definition"
import { append_, empty } from "../core"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 */
export function zipWithIndexOffset_<A>(
  self: Chunk<A>,
  offset: number
): Chunk<Tuple<[A, number]>> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let i = offset
  let builder = empty<Tuple<[A, number]>>()
  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (j < len) {
      const a = array[j]!
      builder = append_(builder, Tuple(a, i))
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
): <A>(self: Chunk<A>) => Chunk<Tuple<[A, number]>> {
  return (self) => zipWithIndexOffset_(self, offset)
}

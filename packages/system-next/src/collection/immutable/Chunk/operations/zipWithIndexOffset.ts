import { Tuple } from "../../Tuple"
import { Chunk, concreteId } from "../definition"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 *
 * @tsplus fluent ets/Chunk zipWithIndexOffset
 */
export function zipWithIndexOffset_<A>(
  self: Chunk<A>,
  offset: number
): Chunk<Tuple<[A, number]>> {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next
  let i = offset
  let builder = Chunk.empty<Tuple<[A, number]>>()
  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (j < len) {
      const a = array[j]!
      builder = builder.append(Tuple(a, i))
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
export function zipWithIndexOffset(offset: number) {
  return <A>(self: Chunk<A>): Chunk<Tuple<[A, number]>> =>
    self.zipWithIndexOffset(offset)
}

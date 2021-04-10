import { append_, empty } from "../core"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Zips this chunk with the index of every element, starting from the initial
 * index value.
 */
export function zipWithIndexOffset_<A>(
  self: Chunk<A>,
  offset: number
): Chunk<readonly [A, number]> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let i = offset
  let builder = empty<readonly [A, number]>()
  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (j < len) {
      const a = array[j]!
      builder = append_(builder, [a, i])
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
 * @dataFirst zipWithIndexOffset_
 */
export function zipWithIndexOffset(
  offset: number
): <A>(self: Chunk<A>) => Chunk<readonly [A, number]> {
  return (self) => zipWithIndexOffset_(self, offset)
}

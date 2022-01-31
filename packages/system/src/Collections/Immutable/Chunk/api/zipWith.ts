// ets_tracing: off

import { append_, empty } from "../core.js"
import type { Chunk } from "../definition.js"
import { concreteId } from "../definition.js"

/**
 * Zips this chunk with the specified chunk using the specified combiner.
 */
export function zipWith_<A, B, C>(
  self: Chunk<A>,
  that: Chunk<B>,
  f: (a: A, b: B) => C
): Chunk<C> {
  const length = Math.min(concreteId(self).length, concreteId(that).length)

  if (length === 0) {
    return empty()
  }

  const leftIterator = concreteId(self).arrayLikeIterator()
  const rightIterator = concreteId(that).arrayLikeIterator()
  let i = 0
  let j = 0
  let k = 0
  let leftLength = 0
  let rightLength = 0
  let left: ArrayLike<A> | undefined = undefined
  let right: ArrayLike<B> | undefined = undefined
  let leftNext
  let rightNext
  let builder = empty<C>()

  while (i < length) {
    if (j < leftLength && k < rightLength) {
      builder = append_(builder, f(left![j]!, right![k]!))
      i++
      j++
      k++
    } else if (j === leftLength && (leftNext = leftIterator.next()) && !leftNext.done) {
      left = leftNext.value
      leftLength = left.length
      j = 0
    } else if (
      k === rightLength &&
      (rightNext = rightIterator.next()) &&
      !rightNext.done
    ) {
      right = rightNext.value
      rightLength = right.length
      k = 0
    }
  }

  return builder
}

/**
 * Zips this chunk with the specified chunk using the specified combiner.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, B, C>(
  that: Chunk<B>,
  f: (a: A, b: B) => C
): (self: Chunk<A>) => Chunk<C> {
  return (self) => zipWith_(self, that, f)
}

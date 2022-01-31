// ets_tracing: off

import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 */
export function reduceWhile_<A, S>(
  self: Chunk.Chunk<A>,
  s: S,
  pred: (s: S) => boolean,
  f: (s: S, a: A) => S
): S {
  const iterator = concreteId(self).arrayLikeIterator()
  let next
  let s1 = s
  let cont = true

  while (cont && (next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (cont && i < len) {
      const a = array[i]!
      s1 = f(s1, a)
      cont = pred(s1)
      i++
    }
    next = iterator.next()
  }

  return s1
}

/**
 * Folds over the elements in this chunk from the left.
 * Stops the fold early when the condition is not fulfilled.
 *
 * @ets_data_first reduceWhile_
 */
export function reduceWhile<A, S>(
  s: S,
  pred: (s: S) => boolean,
  f: (s: S, a: A) => S
): (self: Chunk.Chunk<A>) => S {
  return (self) => reduceWhile_(self, s, pred, f)
}

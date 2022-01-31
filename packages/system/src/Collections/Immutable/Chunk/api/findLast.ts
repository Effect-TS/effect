// ets_tracing: off

import type { Refinement } from "../../../../Function/index.js"
import * as O from "../../../../Option/index.js"
import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Returns the last element that satisfies the predicate.
 */
export function findLast_<A, B extends A>(
  self: Chunk.Chunk<A>,
  f: Refinement<A, B>
): O.Option<B>
export function findLast_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): O.Option<A>
export function findLast_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): O.Option<A> {
  const iterator = concreteId(self).reverseArrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = len - 1
    while (i >= 0) {
      const a = array[i]!
      if (f(a)) {
        return O.some(a)
      }
      i--
    }
  }

  return O.none
}

/**
 * Returns the last element that satisfies the predicate.
 *
 * @ets_data_first findLast_
 */
export function findLast<A, B extends A>(
  f: Refinement<A, B>
): (self: Chunk.Chunk<A>) => O.Option<B>
export function findLast<A>(f: (a: A) => boolean): (self: Chunk.Chunk<A>) => O.Option<A>
export function findLast<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => O.Option<A> {
  return (self) => findLast_(self, f)
}

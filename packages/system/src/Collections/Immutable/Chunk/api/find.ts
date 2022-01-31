// ets_tracing: off

import type { Refinement } from "../../../../Function/index.js"
import * as O from "../../../../Option/index.js"
import type * as Chunk from "../core.js"
import { concreteId } from "../definition.js"

/**
 * Returns the first element that satisfies the predicate.
 */
export function find_<A, B extends A>(
  self: Chunk.Chunk<A>,
  f: Refinement<A, B>
): O.Option<B>
export function find_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): O.Option<A>
export function find_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): O.Option<A> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        return O.some(a)
      }
      i++
    }
  }

  return O.none
}

/**
 * Returns the first element that satisfies the predicate.
 *
 * @ets_data_first find_
 */
export function find<A, B extends A>(
  f: Refinement<A, B>
): (self: Chunk.Chunk<A>) => O.Option<B>
export function find<A>(f: (a: A) => boolean): (self: Chunk.Chunk<A>) => O.Option<A>
export function find<A>(f: (a: A) => boolean): (self: Chunk.Chunk<A>) => O.Option<A> {
  return (self) => find_(self, f)
}

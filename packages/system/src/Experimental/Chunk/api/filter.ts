import type { Refinement } from "../../../Function"
import * as Chunk from "../core"
import { concreteId } from "../definition"

/**
 * Returns a filtered subset of this chunk.
 */
export function filter_<A, B extends A>(
  self: Chunk.Chunk<A>,
  f: Refinement<A, B>
): Chunk.Chunk<B>
export function filter_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): Chunk.Chunk<A>
export function filter_<A>(self: Chunk.Chunk<A>, f: (a: A) => boolean): Chunk.Chunk<A> {
  const iterator = concreteId(self).arrayLikeIterator()
  let next = iterator.next()
  let builder = Chunk.empty<A>()
  while (!next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        builder = Chunk.append_(builder, a)
      }
      i++
    }
    next = iterator.next()
  }

  return builder
}

/**
 * Returns a filtered subset of this chunk.
 *
 * @dataFirst filter_
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): (self: Chunk.Chunk<A>) => Chunk.Chunk<B>
export function filter<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A>
export function filter<A>(
  f: (a: A) => boolean
): (self: Chunk.Chunk<A>) => Chunk.Chunk<A> {
  return (self) => filter_(self, f)
}

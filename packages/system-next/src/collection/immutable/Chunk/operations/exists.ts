import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Determines whether a predicate is satisfied for at least one element of this
 * chunk.
 *
 * @tsplus fluent ets/Chunk exists
 */
export function exists_<A>(self: Chunk<A>, f: (a: A) => boolean): boolean {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        return true
      }
      i++
    }
  }

  return false
}

/**
 * Determines whether a predicate is satisfied for at least one element of this chunk.
 *
 * @ets_data_first exists_
 */
export function exists<A>(f: (a: A) => boolean) {
  return (self: Chunk<A>): boolean => self.exists(f)
}

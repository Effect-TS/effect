import type { Predicate } from "../../../../data/Function"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the first index for which the given predicate is satisfied after or
 * at some given index.
 *
 * @tsplus fluent ets/Chunk indexWhereFrom
 */
export function indexWhereFrom_<A>(
  self: Chunk<A>,
  from: number,
  f: Predicate<A>
): number {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next
  let i = 0

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    if (i + len - 1 >= from) {
      let j = 0
      while (j < len) {
        const a = array[j]!
        if (i >= from && f(a)) {
          return i
        }
        j++
        i++
      }
    } else {
      i += len
    }
  }

  return -1
}

/**
 * Returns the first index for which the given predicate is satisfied after or
 * at some given index.
 *
 * @ets_data_first indexWhereFrom_
 */
export function indexWhereFrom<A>(from: number, f: (a: A) => boolean) {
  return (self: Chunk<A>): number => self.indexWhereFrom(from, f)
}

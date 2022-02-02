import type { Predicate, Refinement } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the last element that satisfies the predicate.
 *
 * @tsplus fluent ets/Chunk findLast
 */
export function findLast_<A, B extends A>(
  self: Chunk<A>,
  f: Refinement<A, B>
): Option<B>
export function findLast_<A>(self: Chunk<A>, f: Predicate<A>): Option<A>
export function findLast_<A>(self: Chunk<A>, f: Predicate<A>): Option<A> {
  const iterator = concreteId(self)._reverseArrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = len - 1
    while (i >= 0) {
      const a = array[i]!
      if (f(a)) {
        return Option.some(a)
      }
      i--
    }
  }

  return Option.none
}

/**
 * Returns the last element that satisfies the predicate.
 *
 * @ets_data_first findLast_
 */
export function findLast<A, B extends A>(
  f: Refinement<A, B>
): (self: Chunk<A>) => Option<B>
export function findLast<A>(f: Predicate<A>): (self: Chunk<A>) => Option<A>
export function findLast<A>(f: Predicate<A>) {
  return (self: Chunk<A>): Option<A> => self.findLast(f)
}

import type { Predicate, Refinement } from "../../../../data/Function"
import { Option } from "../../../../data/Option"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"

/**
 * Returns the first element that satisfies the predicate.
 *
 * @tsplus fluent ets/Chunk find
 */
export function find_<A, B extends A>(self: Chunk<A>, f: Refinement<A, B>): Option<B>
export function find_<A>(self: Chunk<A>, f: Predicate<A>): Option<A>
export function find_<A>(self: Chunk<A>, f: Predicate<A>): Option<A> {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next

  while ((next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let i = 0
    while (i < len) {
      const a = array[i]!
      if (f(a)) {
        return Option.some(a)
      }
      i++
    }
  }

  return Option.none
}

/**
 * Returns the first element that satisfies the predicate.
 *
 * @ets_data_first find_
 */
export function find<A, B extends A>(f: Refinement<A, B>): (self: Chunk<A>) => Option<B>
export function find<A>(f: Predicate<A>): (self: Chunk<A>) => Option<A>
export function find<A>(f: Predicate<A>) {
  return (self: Chunk<A>): Option<A> => self.find(f)
}

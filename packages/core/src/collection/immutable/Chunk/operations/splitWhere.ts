import type { Predicate } from "../../../../data/Function"
import type { Tuple } from "../../Tuple"
import type { Chunk } from "../definition"
import { concreteId } from "../definition"
/**
 * Splits this chunk on the first element that matches this predicate.
 *
 * @tsplus fluent ets/Chunk splitWhere
 */
export function splitWhere_<A>(
  self: Chunk<A>,
  f: Predicate<A>
): Tuple<[Chunk<A>, Chunk<A>]> {
  const iterator = concreteId(self)._arrayLikeIterator()
  let next
  let cont = true
  let i = 0

  while (cont && (next = iterator.next()) && !next.done) {
    const array = next.value
    const len = array.length
    let j = 0
    while (cont && j < len) {
      const a = array[j]!
      if (f(a)) {
        cont = false
      } else {
        i++
        j++
      }
    }
  }

  return self.splitAt(i)
}

/**
 * Splits this chunk on the first element that matches this predicate.
 *
 * @ets_data_first splitWhere_
 */
export function splitWhere<A>(f: (a: A) => boolean) {
  return (self: Chunk<A>): Tuple<[Chunk<A>, Chunk<A>]> => self.splitWhere(f)
}

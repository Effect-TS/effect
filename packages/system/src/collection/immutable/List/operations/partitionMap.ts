import type { Either } from "../../../../data/Either"
import { Tuple } from "../../Tuple"
import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Splits the list into two lists. One list that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 * @tsplus fluent ets/List partitionMap
 */
export function partitionMap_<A, B, C>(
  self: List<A>,
  f: (a: A) => Either<B, C>
): Tuple<[List<B>, List<C>]> {
  return self.reduce(
    Tuple(MutableList.emptyPushable<B>(), MutableList.emptyPushable<C>()),
    (acc, a) => {
      const fa = f(a)
      if (fa._tag === "Left") {
        acc.get(0).push(fa.left)
      } else {
        acc.get(1).push(fa.right)
      }
      return acc
    }
  )
}

/**
 * Splits the list into two lists. One list that contains the lefts
 * and one contains the rights
 *
 * @complexity O(n)
 * @ets_data_first partitionMap_
 */
export function partitionMap<A, B, C>(f: (a: A) => Either<B, C>) {
  return (self: List<A>): Tuple<[List<B>, List<C>]> => self.partitionMap(f)
}

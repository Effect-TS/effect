import type { Predicate, Refinement } from "../../../../data/Function"
import * as Tp from "../../Tuple"
import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Splits the list into two lists. One list that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 * @ets fluent ets/List partition
 */
export function partition_<A, B extends A>(
  self: List<A>,
  f: Refinement<A, B>
): Tp.Tuple<[List<B>, List<Exclude<A, B>>]>
export function partition_<A>(
  self: List<A>,
  f: Predicate<A>
): Tp.Tuple<[List<A>, List<A>]>
export function partition_<A>(
  self: List<A>,
  f: Predicate<A>
): Tp.Tuple<[List<A>, List<A>]> {
  return self.reduce(
    Tp.tuple(MutableList.emptyPushable<A>(), MutableList.emptyPushable<A>()),
    (acc, a) => (f(a) ? acc.get(0).push(a) : acc.get(1).push(a), acc)
  )
}

/**
 * Splits the list into two lists. One list that contains all the
 * values for which the predicate returns `true` and one containing
 * the values for which it returns `false`.
 *
 * @complexity O(n)
 * @ets_data_first partition_
 */
export function partition<A, B extends A>(
  f: Refinement<A, B>
): (self: List<A>) => Tp.Tuple<[List<B>, List<Exclude<A, B>>]>
export function partition<A>(
  f: Predicate<A>
): (self: List<A>) => Tp.Tuple<[List<A>, List<A>]>
export function partition<A>(f: Predicate<A>) {
  return (self: List<A>): Tp.Tuple<[List<A>, List<A>]> => self.partition(f)
}

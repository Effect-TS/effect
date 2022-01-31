import type { Predicate, Refinement } from "../../../../data/Function"
import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Returns a new list that only contains the elements of the original
 * list for which the predicate returns `true`.
 *
 * @complexity O(n)
 * @ets fluent ets/List filter
 */
export function filter_<A, B extends A>(self: List<A>, f: Refinement<A, B>): List<B>
export function filter_<A>(self: List<A>, f: Predicate<A>): List<A>
export function filter_<A>(self: List<A>, f: Predicate<A>): List<A> {
  return self.reduce(MutableList.emptyPushable(), (acc, a) =>
    f(a) ? acc.push(a) : acc
  )
}

/**
 * Returns a new list that only contains the elements of the original
 * list for which the predicate returns `true`.
 *
 * @complexity O(n)
 * @ets_data_first filter_
 */
export function filter<A, B extends A>(f: Refinement<A, B>): (self: List<A>) => List<B>
export function filter<A>(f: Predicate<A>): (self: List<A>) => List<A>
export function filter<A>(f: Predicate<A>) {
  return (self: List<A>): List<A> => self.filter(f)
}

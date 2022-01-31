import type { Option } from "../../../../data/Option"
import type { List } from "../definition"
import { MutableList } from "../definition"

/**
 * Returns a new list that only contains the elements of the original
 * list for which the f returns `Some`.
 *
 * @complexity O(n)
 * @ets fluent ets/List collect
 */
export function collect_<A, B>(self: List<A>, f: (a: A) => Option<B>): List<B> {
  return self.reduce(MutableList.emptyPushable(), (acc, a) => {
    const oa = f(a)
    return oa._tag === "Some" ? acc.push(oa.value) : acc
  })
}

/**
 * Returns a new list that only contains the elements of the original
 * list for which the f returns `Some`.
 *
 * @complexity O(n)
 * @ets_data_first collect_
 */
export function collect<A, B>(f: (a: A) => Option<B>) {
  return (self: List<A>): List<B> => self.collect(f)
}

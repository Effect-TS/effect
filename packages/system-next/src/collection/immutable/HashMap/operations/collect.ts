import type { Option } from "../../../../data/Option"
import type { HashMap } from "../definition"

/**
 * Maps over the values of the `HashMap` using the specified partial function
 * and filters out `None` values.
 *
 * @tsplus fluent ets/HashMap collect
 */
export function collect_<K, A, B>(
  self: HashMap<K, A>,
  f: (a: A) => Option<B>
): HashMap<K, B> {
  return self.collectWithIndex((_, a) => f(a))
}

/**
 * Maps over the values of the `HashMap` using the specified partial function
 * and filters out `None` values.
 *
 * @ets_data_first collect_
 */
export function collect<A, B>(f: (a: A) => Option<B>) {
  return <K>(self: HashMap<K, A>): HashMap<K, B> => self.collect(f)
}

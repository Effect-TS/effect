import type { Option } from "../../../../data/Option"
import { HashMap } from "../definition"

/**
 * Maps over the entries of the `HashMap` using the specified partial function
 * and filters out `None` values.
 *
 * @tsplus fluent ets/HashMap collectWithIndex
 */
export function collectWithIndex_<K, A, B>(
  self: HashMap<K, A>,
  f: (k: K, a: A) => Option<B>
): HashMap<K, B> {
  const m = HashMap.empty<K, B>()
  return m.mutate((m) => {
    for (const [k, a] of self) {
      const o = f(k, a)
      if (o.isSome()) {
        m.set(k, o.value)
      }
    }
  })
}

/**
 * Maps over the entries of the `HashMap` using the specified partial function
 * and filters out `None` values.
 *
 * @ets_data_first collectWithIndex_
 */
export function collectWithIndex<K, A, B>(f: (k: K, a: A) => Option<B>) {
  return (self: HashMap<K, A>): HashMap<K, B> => self.collectWithIndex(f)
}

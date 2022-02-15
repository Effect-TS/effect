import type { Option } from "../../../../data/Option"
import type { HashMap } from "../definition"

/**
 * Filters out `None` values from a `HashMap` of `Option`s.
 *
 * @tsplus fluent ets/HashMap compact
 */
export function compact<K, A>(self: HashMap<K, Option<A>>): HashMap<K, A> {
  return self.collectWithIndex((_, a) => a)
}

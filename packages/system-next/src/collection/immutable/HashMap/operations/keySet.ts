import type { HashSet } from "../../HashSet"
import { HashSetInternal } from "../../HashSet/operations/_internal/hashSet"
import type { HashMap } from "../definition"

/**
 * Returns a `HashSet` of keys within the `HashMap`.
 *
 * @tsplus fluent ets/HashMap keySet
 */
export function keySet<K, V>(self: HashMap<K, V>): HashSet<K> {
  return new HashSetInternal(self)
}

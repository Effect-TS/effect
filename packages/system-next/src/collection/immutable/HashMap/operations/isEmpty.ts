import type { HashMap } from "../definition"
import { realHashMap } from "./_internal/hashMap"
import { Node } from "./node"

/**
 * Checks if the `HashMap` contains any entries.
 *
 * @tsplus fluent ets/HashMap isEmpty
 */
export function isEmpty<K, V>(self: HashMap<K, V>): boolean {
  realHashMap(self)
  return self && Node.isEmptyNode(self._root)
}

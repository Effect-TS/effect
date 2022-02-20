import type { HashMap } from "../definition"
import { HashMapInternal } from "./_internal/hashMap"
import { EmptyNode } from "./_internal/node"

/**
 * Creates a new `HashMap`.
 *
 * @tsplus static ets/HashMapOps empty
 */
export function empty<K, V>(): HashMap<K, V> {
  return new HashMapInternal<K, V>(false, 0, new EmptyNode(), 0)
}

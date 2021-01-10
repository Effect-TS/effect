// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"
import type { Leaf } from "../Nodes"
import { iterator } from "../Primitives"

/**
 * Get an iterator of the map keys
 */
export function keys<K, V>(map: HashMap<K, V>): IterableIterator<K> {
  return iterator(map._root, nodeKeys)
}

function nodeKeys<K, V>(node: Leaf<K, V>): K {
  return node.key
}

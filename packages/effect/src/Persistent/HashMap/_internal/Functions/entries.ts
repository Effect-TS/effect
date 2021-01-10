// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"
import type { Leaf } from "../Nodes"
import { iterator } from "../Primitives"

/**
 * Retrieve the map entries as an iterator
 */
export function entries<K, V>(map: HashMap<K, V>): IterableIterator<[K, V]> {
  return iterator(map._root, nodeEntries)
}

function nodeEntries<K, V>(node: Leaf<K, V>): [K, V] {
  return [node.key, node.value]
}

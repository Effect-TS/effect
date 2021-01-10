// copyright https://github.com/frptools

import type { HashMap } from "../HashMap"
import type { Leaf } from "../Nodes"
import { iterator } from "../Primitives"

/**
 * Get an iterator of the map values
 */
export function values<K, V>(map: HashMap<K, V>): IterableIterator<V> {
  return iterator(map._root, nodeValues)
}

function nodeValues<K, V>(node: Leaf<K, V>): V {
  return node.value
}

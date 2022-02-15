import type { HashMap } from "../definition"
import { HashMapInternal, realHashMap } from "./_internal/hashMap"
import type { Node } from "./node"

/**
 * Sets the root of the `HashMap`.
 *
 * @tsplus fluent ets/HashMap setTree
 */
export function setTree_<K, V>(
  self: HashMap<K, V>,
  newRoot: Node<K, V>,
  newSize: number
): HashMap<K, V> {
  realHashMap(self)
  if (self._editable) {
    self._root = newRoot
    self._size = newSize
    return self
  }
  return newRoot === self._root
    ? self
    : new HashMapInternal(self._editable, self._edit, newRoot, newSize)
}

/**
 * Sets the root of the `HashMap`.
 *
 * @ets_data_first setTree_
 */
export function setTree<K, V>(newRoot: Node<K, V>, newSize: number) {
  return (self: HashMap<K, V>): HashMap<K, V> => self.setTree(newRoot, newSize)
}

import type { HashMap } from "../definition"
import { realHashMap } from "./_internal/hashMap"
import { Node } from "./node"

/**
 * Reduces the specified state over the entries of the `HashMap`.
 *
 * @tsplus fluent ets/HashMap reduceWithIndex
 */
export function reduceWithIndex_<K, V, Z>(
  self: HashMap<K, V>,
  z: Z,
  f: (z: Z, k: K, v: V) => Z
): Z {
  realHashMap(self)
  const root = self._root
  if (root._tag === "LeafNode")
    return root.value.isSome() ? f(z, root.key, root.value.value) : z
  if (root._tag === "EmptyNode") {
    return z
  }
  const toVisit = [root.children]
  let children
  while ((children = toVisit.pop())) {
    for (let i = 0, len = children.length; i < len; ) {
      const child = children[i++]
      if (child && !Node.isEmptyNode(child)) {
        if (child._tag === "LeafNode") {
          if (child.value.isSome()) {
            z = f(z, child.key, child.value.value)
          }
        } else toVisit.push(child.children)
      }
    }
  }
  return z
}

/**
 * Reduces the specified state over the entries of the `HashMap`.
 *
 * @ets_data_first reduceWithIndex_
 */
export function reduceWithIndex<K, V, Z>(z: Z, f: (z: Z, k: K, v: V) => Z) {
  return (self: HashMap<K, V>): Z => self.reduceWithIndex(z, f)
}

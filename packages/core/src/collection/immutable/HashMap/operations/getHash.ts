import { Option } from "../../../../data/Option"
import * as St from "../../../../prelude/Structural"
import type { HashMap } from "../definition"
import { fromBitmap, hashFragment, toBitmap } from "./_internal/bitwise"
import { SIZE } from "./_internal/config"
import { realHashMap } from "./_internal/hashMap"

/**
 * Lookup the value for the specified key in the `HashMap` using a custom hash.
 *
 * @tsplus fluent ets/HashMap getHash
 */
export function getHash_<K, V>(self: HashMap<K, V>, key: K, hash: number): Option<V> {
  realHashMap(self)
  let node = self._root
  let shift = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    switch (node._tag) {
      case "LeafNode": {
        return St.equals(key, node.key) ? node.value : Option.none
      }
      case "CollisionNode": {
        if (hash === node.hash) {
          const children = node.children
          for (let i = 0, len = children.length; i < len; ++i) {
            const child = children[i]!
            if ("key" in child && St.equals(key, child.key)) return child.value
          }
        }
        return Option.none
      }
      case "IndexedNode": {
        const frag = hashFragment(shift, hash)
        const bit = toBitmap(frag)
        if (node.mask & bit) {
          node = node.children[fromBitmap(node.mask, bit)]!
          shift += SIZE
          break
        }
        return Option.none
      }
      case "ArrayNode": {
        node = node.children[hashFragment(shift, hash)]!
        if (node) {
          shift += SIZE
          break
        }
        return Option.none
      }
      default:
        return Option.none
    }
  }
}

/**
 * Lookup the value for the specified key in the `HashMap` using a custom hash.
 *
 * @ets_data_first getHash_
 */
export function getHash<K>(key: K, hash: number) {
  return <V>(self: HashMap<K, V>): Option<V> => self.getHash(key, hash)
}

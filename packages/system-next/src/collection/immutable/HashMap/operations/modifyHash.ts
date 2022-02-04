import type { HashMap } from "../definition"
import { realHashMap } from "./_internal/hashMap"
import type { UpdateFn } from "./_internal/node"

/**
 * Alter the value of the specified key in the `HashMap` using the specified
 * update function. The value of the specified key will be computed using the
 * provided hash.
 *
 * The update function will be invoked with the current value of the key if it
 * exists, or `None` if no such value exists.
 *
 * This function will always either update or insert a value into the `HashMap`.
 *
 * @tsplus fluent ets/HashMap modifyHash
 */
export function modifyHash_<K, V>(
  self: HashMap<K, V>,
  key: K,
  hash: number,
  f: UpdateFn<V>
): HashMap<K, V> {
  realHashMap(self)
  const size = { value: self._size }
  const newRoot = self._root.modify(
    self._editable ? self._edit : NaN,
    0,
    f,
    hash,
    key,
    size
  )
  return (self as HashMap<K, V>).setTree(newRoot, size.value)
}

/**
 * Alter the value of the specified key in the `HashMap` using the specified
 * update function. The value of the specified key will be computed using the
 * provided hash.
 *
 * The update function will be invoked with the current value of the key if it
 * exists, or `None` if no such value exists.
 *
 * This function will always either update or insert a value into the `HashMap`.
 *
 * @ets_data_first modifyHash_
 */
export function modifyHash<K, V>(key: K, hash: number, f: UpdateFn<V>) {
  return (self: HashMap<K, V>): HashMap<K, V> => self.modifyHash(key, hash, f)
}

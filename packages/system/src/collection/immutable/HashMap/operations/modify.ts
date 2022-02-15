import * as St from "../../../../prelude/Structural"
import type { HashMap } from "../definition"
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
 * @tsplus fluent ets/HashMap modify
 */
export function modify_<K, V>(
  self: HashMap<K, V>,
  key: K,
  f: UpdateFn<V>
): HashMap<K, V> {
  return self.modifyHash(key, St.hash(key), f)
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
 * @ets_data_first modify_
 */
export function modify<K, V>(key: K, f: UpdateFn<V>) {
  return (self: HashMap<K, V>): HashMap<K, V> => self.modify(key, f)
}

import { NoSuchElementException } from "../../../../data/GlobalExceptions"
import * as St from "../../../../prelude/Structural"
import type { HashMap } from "../definition"

/**
 * Unsafely lookup the value for the specified key in the `HashMap` using the
 * internal hashing function.
 *
 * @tsplus fluent ets/HashMap unsafeGet
 */
export function unsafeGet_<K, V>(self: HashMap<K, V>, key: K): V {
  const element = self.getHash(key, St.hash(key))
  if (element.isNone()) {
    throw new NoSuchElementException()
  }
  return element.value
}

/**
 * Unsafely lookup the value for the specified key in the `HashMap` using the
 * internal hashing function.
 *
 * @ets_data_first unsafeGet_
 */
export function unsafeGet<K>(key: K) {
  return <V>(self: HashMap<K, V>): V => self.unsafeGet(key)
}

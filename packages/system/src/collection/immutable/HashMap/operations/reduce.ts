import type { HashMap } from "../definition"

/**
 * Reduces the specified state over the values of the `HashMap`.
 *
 * @tsplus fluent ets/HashMap reduce
 */
export function reduce_<K, V, Z>(self: HashMap<K, V>, z: Z, f: (z: Z, v: V) => Z): Z {
  return self.reduceWithIndex(z, (z, _, v) => f(z, v))
}

/**
 * Reduces the specified state over the values of the `HashMap`.
 *
 * @ets_data_first reduce_
 */
export function reduce<V, Z>(z: Z, f: (z: Z, v: V) => Z) {
  return <K>(map: HashMap<K, V>): Z => reduce_(map, z, f)
}

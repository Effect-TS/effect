// copyright https://github.com/frptools

import { identity } from "../../../../Function"
import { isEqual as eq } from "../../../_internal/Structural"
import type { HashMap } from "../HashMap"
import type { Leaf } from "../Nodes"
import { iterator } from "../Primitives"

/**
 * Checks if the maps are equal
 */
export function isEqual_<K, V>(map: HashMap<K, V>, other: HashMap<K, V>): boolean {
  if (map === other) return true
  if (map._size !== other._size) return false

  const ita = iterator(map._root, identity),
    itb = iterator(other._root, identity)

  let ca: IteratorResult<Leaf<K, V>>,
    cb: IteratorResult<Leaf<K, V>>,
    a: Leaf<K, V>,
    b: Leaf<K, V>

  while (!((ca = ita.next()), (cb = itb.next())).done) {
    a = ca.value
    b = cb.value
    if (!eq(a.key, b.key) || !eq(a.value, b.value)) return false
  }
  return true
}

/**
 * Checks if the maps are equal
 */
export function isEqual<K, V>(other: HashMap<K, V>) {
  return (map: HashMap<K, V>) => isEqual_(map, other)
}

import type { Eq } from "../../Eq"
import { isSome } from "../../Option"

import { lookup } from "./lookup"

/**
 * Test whether or not a key exists in a map
 *
 * @since 2.5.0
 */
export function member<K>(E: Eq<K>): <A>(k: K, m: ReadonlyMap<K, A>) => boolean {
  const lookupE = lookup(E)
  return (k, m) => isSome(lookupE(k, m))
}

import type { Eq } from "../../Eq"
import { Option, map_ } from "../../Option"

import { lookupWithKey } from "./lookupWithKey"

/**
 * Lookup the value for a key in a `Map`.
 *
 * @since 2.5.0
 */
export function lookup<K>(E: Eq<K>): <A>(k: K, m: ReadonlyMap<K, A>) => Option<A> {
  const lookupWithKeyE = lookupWithKey(E)
  return (k, m) => map_(lookupWithKeyE(k, m), ([_, a]) => a)
}

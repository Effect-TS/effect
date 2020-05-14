import type { Eq } from "../../Eq"
import type { Option } from "../../Option"
import { map_ } from "../../Option"

import { deleteAt } from "./deleteAt"
import { lookup } from "./lookup"

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 *
 * @since 2.5.0
 */
export function pop<K>(
  E: Eq<K>
): (k: K) => <A>(m: ReadonlyMap<K, A>) => Option<readonly [A, ReadonlyMap<K, A>]> {
  const lookupE = lookup(E)
  const deleteAtE = deleteAt(E)
  return (k) => {
    const deleteAtEk = deleteAtE(k)
    return (m) => map_(lookupE(k, m), (a) => [a, deleteAtEk(m)])
  }
}

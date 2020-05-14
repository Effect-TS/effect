import type { Ord } from "../../Ord"

import { collect } from "./collect"

/**
 * Get a sorted of the key/value pairs contained in a map
 *
 * @since 2.5.0
 */
export function toReadonlyArray<K>(
  O: Ord<K>
): <A>(m: ReadonlyMap<K, A>) => ReadonlyArray<readonly [K, A]> {
  return collect(O)((k, a) => [k, a] as const)
}

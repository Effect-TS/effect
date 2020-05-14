import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map/toReadonlyArray"

/**
 * Get a sorted of the key/value pairs contained in a map
 *
 * @since 2.0.0
 */
export const toArray: <K>(
  O: Ord<K>
) => <A>(m: Map<K, A>) => Array<[K, A]> = RM.toReadonlyArray as any

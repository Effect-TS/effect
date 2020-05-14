import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map/keys"

/**
 * Get a sorted array of the keys contained in a map
 *
 * @since 2.0.0
 */
export const keys: <K>(O: Ord<K>) => <A>(m: Map<K, A>) => Array<K> = RM.keys as any

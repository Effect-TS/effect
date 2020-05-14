import type { Ord } from "../Ord"
import * as RM from "../Readonly/Map/values"

/**
 * Get a sorted array of the values contained in a map
 *
 * @since 2.0.0
 */
export const values: <A>(O: Ord<A>) => <K>(m: Map<K, A>) => Array<A> = RM.values as any

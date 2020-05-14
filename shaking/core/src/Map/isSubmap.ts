import type { Eq } from "../Eq"
import * as RM from "../Readonly/Map/isSubmap"

/**
 * Test whether or not one Map contains all of the keys and values contained in another Map
 *
 * @since 2.0.0
 */
export const isSubmap: <K, A>(
  SK: Eq<K>,
  SA: Eq<A>
) => (d1: Map<K, A>, d2: Map<K, A>) => boolean = RM.isSubmap

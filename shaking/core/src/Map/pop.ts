import type { Eq } from "../Eq"
import type { Option } from "../Option"
import * as RM from "../Readonly/Map/pop"

/**
 * Delete a key and value from a map, returning the value as well as the subsequent map
 *
 * @since 2.0.0
 */
export const pop: <K>(
  E: Eq<K>
) => (k: K) => <A>(m: Map<K, A>) => Option<[A, Map<K, A>]> = RM.pop as any

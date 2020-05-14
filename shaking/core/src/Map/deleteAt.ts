import type { Eq } from "../Eq"
import * as RM from "../Readonly/Map/deleteAt"

/**
 * Delete a key and value from a map
 *
 * @since 2.0.0
 */
export const deleteAt: <K>(
  E: Eq<K>
) => (k: K) => <A>(m: Map<K, A>) => Map<K, A> = RM.deleteAt as any

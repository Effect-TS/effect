import type { Eq } from "../Eq"
import * as RM from "../Readonly/Map/insertAt"

/**
 * Insert or replace a key/value pair in a map
 *
 * @since 2.0.0
 */
export const insertAt: <K>(
  E: Eq<K>
) => <A>(k: K, a: A) => (m: Map<K, A>) => Map<K, A> = RM.insertAt as any

import type { Eq } from "../Eq"
import type { Option } from "../Option"
import * as RM from "../Readonly/Map/lookupWithKey"

/**
 * Lookup the value for a key in a `Map`.
 * If the result is a `Some`, the existing key is also returned.
 *
 * @since 2.0.0
 */
export const lookupWithKey: <K>(
  E: Eq<K>
) => <A>(k: K, m: Map<K, A>) => Option<[K, A]> = RM.lookupWithKey as any

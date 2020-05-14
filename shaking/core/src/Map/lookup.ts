import type { Eq } from "../Eq"
import type { Option } from "../Option"
import * as RM from "../Readonly/Map/lookup"

/**
 * Lookup the value for a key in a `Map`.
 *
 * @since 2.0.0
 */
export const lookup: <K>(E: Eq<K>) => <A>(k: K, m: Map<K, A>) => Option<A> = RM.lookup

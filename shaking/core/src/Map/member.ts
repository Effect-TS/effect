import type { Eq } from "../Eq"
import * as RM from "../Readonly/Map/member"

/**
 * Test whether or not a key exists in a map
 *
 * @since 2.0.0
 */
export const member: <K>(E: Eq<K>) => <A>(k: K, m: Map<K, A>) => boolean = RM.member

import type { Eq } from "../Eq"
import * as RM from "../Readonly/Map/getEq"

/**
 * @since 2.0.0
 */
export const getEq: <K, A>(SK: Eq<K>, SA: Eq<A>) => Eq<Map<K, A>> = RM.getEq

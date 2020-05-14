import type { Eq } from "../Eq"
import { getEq as getEq_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const getEq: <A>(E: Eq<A>) => Eq<Set<A>> = getEq_1

import type { Eq } from "../Eq"
import { isSubset } from "../Readonly/Set"

/**
 * `true` if and only if every element in the first set is an element of the second set
 *
 * @since 2.0.0
 */
export const subset: <A>(E: Eq<A>) => (x: Set<A>, y: Set<A>) => boolean = isSubset

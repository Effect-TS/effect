import type { Eq } from "../Eq"
import { elem as elem_1 } from "../Readonly/Set"

/**
 * Test if a value is a member of a set
 *
 * @since 2.0.0
 */
export const elem: <A>(E: Eq<A>) => (a: A, set: Set<A>) => boolean = elem_1

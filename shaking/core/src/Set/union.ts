import { Eq } from "../Eq"
import { union as union_1 } from "../Readonly/Set"

/**
 * Form the union of two sets
 *
 * @since 2.0.0
 */
export const union: <A>(E: Eq<A>) => (set: Set<A>, y: Set<A>) => Set<A> = union_1 as any

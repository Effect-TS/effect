import type { Eq } from "../Eq"
import type { Monoid } from "../Monoid"
import { getUnionMonoid as getUnionMonoid_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const getUnionMonoid: <A>(E: Eq<A>) => Monoid<Set<A>> = getUnionMonoid_1 as any

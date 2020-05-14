import type { Eq } from "../Eq"
import { getIntersectionSemigroup as getIntersectionSemigroup_1 } from "../Readonly/Set"
import type { Semigroup } from "../Semigroup"

/**
 * @since 2.0.0
 */
export const getIntersectionSemigroup: <A>(
  E: Eq<A>
) => Semigroup<Set<A>> = getIntersectionSemigroup_1 as any

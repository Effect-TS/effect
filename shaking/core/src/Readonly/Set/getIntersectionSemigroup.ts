import type { Eq } from "../../Eq"
import type { Semigroup } from "../../Semigroup"

import { intersection } from "./intersection"

/**
 * @since 2.5.0
 */
export function getIntersectionSemigroup<A>(E: Eq<A>): Semigroup<ReadonlySet<A>> {
  return {
    concat: intersection(E)
  }
}

import type { Eq } from "../../Eq"
import type { Monoid } from "../../Monoid"

import { empty } from "./empty"
import { union } from "./union"

/**
 * @since 2.5.0
 */

export function getUnionMonoid<A>(E: Eq<A>): Monoid<ReadonlySet<A>> {
  return {
    concat: union(E),
    empty
  }
}

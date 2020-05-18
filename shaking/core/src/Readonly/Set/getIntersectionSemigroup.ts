import { Eq } from "../../Eq"
import { Semigroup } from "../../Semigroup"

import { intersection } from "./intersection"

export function getIntersectionSemigroup<A>(E: Eq<A>): Semigroup<ReadonlySet<A>> {
  return {
    concat: intersection(E)
  }
}

import { Eq } from "../../Eq"
import { Monoid } from "../../Monoid"

import { empty } from "./empty"
import { union } from "./union"

export function getUnionMonoid<A>(E: Eq<A>): Monoid<ReadonlySet<A>> {
  return {
    concat: union(E),
    empty
  }
}

import { Semigroup } from "../Base"
import { Eq } from "../Eq"
import * as RS from "../Readonly/Set"

export const getIntersectionSemigroup: <A>(
  E: Eq<A>
) => Semigroup<Set<A>> = RS.getIntersectionSemigroup as any

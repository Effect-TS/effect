import { Monoid } from "../Base"
import { Eq } from "../Eq"
import * as RS from "../Readonly/Set"

export const getUnionMonoid: <A>(E: Eq<A>) => Monoid<Set<A>> = RS.getUnionMonoid as any

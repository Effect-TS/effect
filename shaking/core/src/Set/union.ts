import { Eq } from "../Eq"
import * as RS from "../Readonly/Set"

/**
 * Form the union of two sets
 */
export const union: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = RS.union as any

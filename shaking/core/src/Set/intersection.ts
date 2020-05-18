import { Eq } from "../Eq"
import * as RS from "../Readonly/Set"

/**
 * The set of elements which are in both the first and second set
 */
export const intersection: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = RS.intersection as any

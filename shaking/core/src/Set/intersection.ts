import { Eq } from "../Eq"
import { intersection as intersection_1 } from "../Readonly/Set"

/**
 * The set of elements which are in both the first and second set
 *
 * @since 2.0.0
 */
export const intersection: <A>(
  E: Eq<A>
) => (set: Set<A>, y: Set<A>) => Set<A> = intersection_1 as any

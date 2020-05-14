import type { Eq } from "../Eq"
import { remove as remove_1 } from "../Readonly/Set"

/**
 * Delete a value from a set
 *
 * @since 2.0.0
 */
export const remove: <A>(
  E: Eq<A>
) => (a: A) => (set: Set<A>) => Set<A> = remove_1 as any

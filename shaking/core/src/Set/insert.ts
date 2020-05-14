import type { Eq } from "../Eq"
import { insert as insert_1 } from "../Readonly/Set"

/**
 * Insert a value into a set
 *
 * @since 2.0.0
 */

export const insert: <A>(
  E: Eq<A>
) => (a: A) => (set: Set<A>) => Set<A> = insert_1 as any

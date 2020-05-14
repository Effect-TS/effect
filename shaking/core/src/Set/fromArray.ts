import type { Eq } from "../Eq"
import { fromArray as fromArray_1 } from "../Readonly/Set"

/**
 * Create a set from an array
 *
 * @since 2.0.0
 */
export const fromArray: <A>(E: Eq<A>) => (as: Array<A>) => Set<A> = fromArray_1 as any

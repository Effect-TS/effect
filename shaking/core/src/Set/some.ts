import type { Predicate } from "../Function"
import { some as some_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const some: <A>(predicate: Predicate<A>) => (set: Set<A>) => boolean = some_1

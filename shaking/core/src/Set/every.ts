import type { Predicate } from "../Function"
import { every as every_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export const every: <A>(predicate: Predicate<A>) => (set: Set<A>) => boolean = every_1

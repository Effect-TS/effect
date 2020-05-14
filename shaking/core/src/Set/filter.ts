import type { Predicate, Refinement } from "../Function"
import { filter as filter_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (set: Set<A>) => Set<B>
export function filter<A>(predicate: Predicate<A>): (set: Set<A>) => Set<A>
export function filter<A>(predicate: Predicate<A>): (set: Set<A>) => Set<A> {
  return filter_1(predicate) as any
}

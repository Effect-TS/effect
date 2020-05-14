import type { Separated } from "fp-ts/lib/Compactable"

import type { Predicate, Refinement } from "../Function"
import { partition as partition_1 } from "../Readonly/Set"

/**
 * @since 2.0.0
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): (set: Set<A>) => Separated<Set<A>, Set<B>>
export function partition<A>(
  predicate: Predicate<A>
): (set: Set<A>) => Separated<Set<A>, Set<A>>
export function partition<A>(
  predicate: Predicate<A>
): (set: Set<A>) => Separated<Set<A>, Set<A>> {
  return partition_1(predicate) as any
}

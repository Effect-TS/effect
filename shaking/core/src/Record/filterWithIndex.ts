import type {
  PredicateWithIndex,
  RefinementWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import { filterWithIndex as filterWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function filterWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: Record<K, A>) => Record<string, B>
export function filterWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: Record<K, A>) => Record<string, A>
export function filterWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Record<string, A>) => Record<string, A> {
  return filterWithIndex_1(predicateWithIndex)
}

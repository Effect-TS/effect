import type { Separated } from "fp-ts/lib/Compactable"
import type {
  PredicateWithIndex,
  RefinementWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import { partitionWithIndex as partitionWithIndex_1 } from "../Readonly/Record"

/**
 * @since 2.0.0
 */
export function partitionWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, B>>
export function partitionWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (fa: Record<K, A>) => Separated<Record<string, A>, Record<string, A>>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (fa: Record<string, A>) => Separated<Record<string, A>, Record<string, A>> {
  return partitionWithIndex_1(predicateWithIndex)
}

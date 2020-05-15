import type { Separated } from "fp-ts/lib/Compactable"
import type {
  PredicateWithIndex,
  RefinementWithIndex
} from "fp-ts/lib/FilterableWithIndex"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { partitionWithIndex_ } from "./partitionWithIndex_"

/**
 * @since 2.5.0
 */
export function partitionWithIndex<K extends string, A, B extends A>(
  refinementWithIndex: RefinementWithIndex<K, A, B>
): (
  fa: ReadonlyRecord<K, A>
) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, B>>
export function partitionWithIndex<K extends string, A>(
  predicateWithIndex: PredicateWithIndex<K, A>
): (
  fa: ReadonlyRecord<K, A>
) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>>
export function partitionWithIndex<A>(
  predicateWithIndex: PredicateWithIndex<string, A>
): (
  fa: ReadonlyRecord<string, A>
) => Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> {
  return (fa) => partitionWithIndex_(fa, predicateWithIndex)
}
